package com.rapidupload.backend.services;

import com.rapidupload.backend.models.Photo;
import com.rapidupload.backend.models.Property;
import com.rapidupload.backend.repositories.PhotoRepository;
import com.rapidupload.backend.repositories.PropertyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticTableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class CleanupService {

    private static final Logger logger = LoggerFactory.getLogger(CleanupService.class);
    private static final int BATCH_DELETE_SIZE = 25; // DynamoDB batch delete limit

    private final PropertyRepository propertyRepository;
    private final PhotoRepository photoRepository;
    private final S3Client s3Client;
    private final DynamoDbEnhancedClient enhancedClient;
    private final String bucketName;
    private final String photosTableName;
    private final String propertiesTableName;

    public CleanupService(
            PropertyRepository propertyRepository,
            PhotoRepository photoRepository,
            S3Client s3Client,
            DynamoDbEnhancedClient enhancedClient,
            @Value("${aws.s3.bucket-name}") String bucketName,
            @Value("${aws.dynamodb.tables.photos}") String photosTableName,
            @Value("${aws.dynamodb.tables.properties}") String propertiesTableName) {
        this.propertyRepository = propertyRepository;
        this.photoRepository = photoRepository;
        this.s3Client = s3Client;
        this.enhancedClient = enhancedClient;
        this.bucketName = bucketName;
        this.photosTableName = photosTableName;
        this.propertiesTableName = propertiesTableName;
    }

    /**
     * Clears all data: deletes all photos from S3, then deletes all items from DynamoDB tables
     */
    public CleanupResult clearAllData() {
        logger.warn("Starting complete data cleanup - this will delete ALL data");
        
        CleanupResult result = new CleanupResult();
        
        try {
            // Step 1: Delete all S3 objects
            result.s3ObjectsDeleted = deleteAllS3Objects();
            
            // Step 2: Delete all photos from DynamoDB
            result.photosDeleted = deleteAllPhotos();
            
            // Step 3: Delete all properties from DynamoDB
            result.propertiesDeleted = deleteAllProperties();
            
            logger.info("Data cleanup completed: {} S3 objects, {} photos, {} properties deleted",
                    result.s3ObjectsDeleted, result.photosDeleted, result.propertiesDeleted);
            
            result.success = true;
            result.message = String.format(
                    "Successfully deleted %d S3 objects, %d photos, and %d properties",
                    result.s3ObjectsDeleted, result.photosDeleted, result.propertiesDeleted);
            
        } catch (Exception e) {
            logger.error("Error during data cleanup", e);
            result.success = false;
            result.message = "Error during cleanup: " + e.getMessage();
        }
        
        return result;
    }

    private int deleteAllS3Objects() {
        logger.info("Deleting all objects from S3 bucket: {}", bucketName);
        int deletedCount = 0;
        
        try {
            String continuationToken = null;
            do {
                ListObjectsV2Request.Builder requestBuilder = ListObjectsV2Request.builder()
                        .bucket(bucketName);
                
                if (continuationToken != null) {
                    requestBuilder.continuationToken(continuationToken);
                }
                
                var response = s3Client.listObjectsV2(requestBuilder.build());
                
                if (response.contents() != null && !response.contents().isEmpty()) {
                    // Delete objects one by one
                    for (S3Object s3Object : response.contents()) {
                        try {
                            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                                    .bucket(bucketName)
                                    .key(s3Object.key())
                                    .build();
                            s3Client.deleteObject(deleteRequest);
                            deletedCount++;
                        } catch (Exception e) {
                            logger.warn("Failed to delete S3 object: {}", s3Object.key(), e);
                            // Continue with other objects
                        }
                    }
                    logger.debug("Deleted {} objects from S3 (total: {})", response.contents().size(), deletedCount);
                }
                
                continuationToken = response.nextContinuationToken();
            } while (continuationToken != null);
            
            logger.info("Deleted {} objects from S3 bucket", deletedCount);
        } catch (Exception e) {
            logger.error("Error deleting S3 objects", e);
            throw new RuntimeException("Failed to delete S3 objects", e);
        }
        
        return deletedCount;
    }

    private int deleteAllPhotos() {
        logger.info("Deleting all photos from DynamoDB table: {}", photosTableName);
        int deletedCount = 0;
        
        try {
            DynamoDbTable<Photo> photoTable = enhancedClient.table(photosTableName, TableSchema.fromBean(Photo.class));
            
            // Scan and delete all photos
            ScanEnhancedRequest scanRequest = ScanEnhancedRequest.builder().build();
            var scanResult = photoTable.scan(scanRequest);
            
            // Process all pages
            for (var page : scanResult) {
                List<Photo> photos = page.items().stream().collect(Collectors.toList());
                
                if (!photos.isEmpty()) {
                    // Delete photos one by one (DynamoDB batch delete would require WriteBatch)
                    for (Photo photo : photos) {
                        Key key = Key.builder()
                                .partitionValue(photo.getPhotoId())
                                .build();
                        photoTable.deleteItem(key);
                        deletedCount++;
                    }
                    logger.debug("Deleted {} photos (total: {})", photos.size(), deletedCount);
                }
            }
            
            logger.info("Deleted {} photos from DynamoDB", deletedCount);
        } catch (Exception e) {
            logger.error("Error deleting photos from DynamoDB", e);
            throw new RuntimeException("Failed to delete photos", e);
        }
        
        return deletedCount;
    }

    private int deleteAllProperties() {
        logger.info("Deleting all properties from DynamoDB table: {}", propertiesTableName);
        int deletedCount = 0;
        
        try {
            // Use the same table schema as PropertyRepository
            TableSchema<Property> propertyTableSchema =
                    StaticTableSchema.builder(Property.class)
                            .newItemSupplier(Property::new)
                            .addAttribute(String.class, a -> a.name("PropertyID")
                                    .getter(Property::getPropertyId)
                                    .setter(Property::setPropertyId)
                                    .tags(StaticAttributeTags.primaryPartitionKey()))
                            .addAttribute(String.class, a -> a.name("Name")
                                    .getter(Property::getName)
                                    .setter(Property::setName))
                            .addAttribute(String.class, a -> a.name("CreatedAt")
                                    .getter(Property::getCreatedAt)
                                    .setter(Property::setCreatedAt))
                            .addAttribute(Integer.class, a -> a.name("PhotoCount")
                                    .getter(Property::getPhotoCount)
                                    .setter(Property::setPhotoCount))
                            .build();
            
            DynamoDbTable<Property> propertyTable = enhancedClient.table(propertiesTableName, propertyTableSchema);
            
            // Scan and delete all properties with pagination (handles all pages, not just first page)
            ScanEnhancedRequest scanRequest = ScanEnhancedRequest.builder().build();
            var scanResult = propertyTable.scan(scanRequest);
            
            // Process all pages
            for (var page : scanResult) {
                List<Property> properties = page.items().stream().collect(Collectors.toList());
                
                if (!properties.isEmpty()) {
                    // Delete properties one by one
                    for (Property property : properties) {
                        Key key = Key.builder()
                                .partitionValue(property.getPropertyId())
                                .build();
                        propertyTable.deleteItem(key);
                        deletedCount++;
                    }
                    logger.debug("Deleted {} properties (total: {})", properties.size(), deletedCount);
                }
            }
            
            logger.info("Deleted {} properties from DynamoDB", deletedCount);
        } catch (Exception e) {
            logger.error("Error deleting properties from DynamoDB", e);
            throw new RuntimeException("Failed to delete properties", e);
        }
        
        return deletedCount;
    }

    public static class CleanupResult {
        public boolean success;
        public String message;
        public int s3ObjectsDeleted;
        public int photosDeleted;
        public int propertiesDeleted;
    }
}


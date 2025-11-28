package com.rapidupload.backend.services;

import com.rapidupload.backend.dto.ConfirmUploadResponse;
import com.rapidupload.backend.exceptions.ConditionalCheckFailedException;
import com.rapidupload.backend.exceptions.PhotoAlreadyConfirmedException;
import com.rapidupload.backend.exceptions.PhotoNotFoundException;
import com.rapidupload.backend.models.AnalysisResult;
import com.rapidupload.backend.models.Photo;
import com.rapidupload.backend.repositories.AnalysisRepository;
import com.rapidupload.backend.repositories.PhotoRepository;
import com.rapidupload.backend.repositories.PropertyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItem;
import software.amazon.awssdk.services.dynamodb.model.TransactWriteItemsRequest;
import software.amazon.awssdk.services.dynamodb.model.Update;
import software.amazon.awssdk.services.dynamodb.model.UpdateItemRequest;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class PhotoService {

    private static final Logger logger = LoggerFactory.getLogger(PhotoService.class);
    private static final int TRANSACTION_BATCH_SIZE = 25; // DynamoDB transaction limit
    private static final int PARALLEL_THREADS = 10;
    private static final int PHOTOS_PER_BATCH = 10; // Process 10 photos in parallel per property to balance speed and avoid transaction conflicts

    private final PhotoRepository photoRepository;
    private final PropertyRepository propertyRepository;
    private final AnalysisRepository analysisRepository;
    private final S3Service s3Service;
    private final DynamoDbClient dynamoDbClient;
    private final String bucketName;
    private final String region;
    private final String photosTableName;
    private final String propertiesTableName;
    private final ExecutorService executorService;

    public PhotoService(PhotoRepository photoRepository,
                       PropertyRepository propertyRepository,
                       AnalysisRepository analysisRepository,
                       S3Service s3Service,
                       DynamoDbClient dynamoDbClient,
                       @Value("${aws.s3.bucket-name}") String bucketName,
                       @Value("${aws.region}") String region,
                       @Value("${aws.dynamodb.tables.photos}") String photosTableName,
                       @Value("${aws.dynamodb.tables.properties}") String propertiesTableName) {
        this.photoRepository = photoRepository;
        this.propertyRepository = propertyRepository;
        this.analysisRepository = analysisRepository;
        this.s3Service = s3Service;
        this.dynamoDbClient = dynamoDbClient;
        this.bucketName = bucketName;
        this.region = region;
        this.photosTableName = photosTableName;
        this.propertiesTableName = propertiesTableName;
        this.executorService = Executors.newFixedThreadPool(PARALLEL_THREADS);
    }

    /**
     * Confirms upload status only (no PhotoCount increment) - allows parallel confirmations
     * Updates photo status from 'pending' to 'uploaded' with conditional write
     * This method is used for immediate confirmation after S3 upload to avoid transaction conflicts
     */
    public ConfirmUploadResponse confirmUploadStatus(String photoId, String propertyId, String s3Key) {
        // First verify photo exists and get current state
        Photo photo = photoRepository.getPhoto(photoId);
        
        // Verify propertyId matches
        if (!propertyId.equals(photo.getPropertyId())) {
            throw new IllegalArgumentException("Property ID mismatch: expected " + photo.getPropertyId() + ", got " + propertyId);
        }

        // If already uploaded, return success (idempotency)
        if ("uploaded".equals(photo.getStatus())) {
            logger.debug("Photo already confirmed (idempotent): photoId={}", photoId);
            String photoUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);
            return new ConfirmUploadResponse(photoId, photoUrl, "uploaded");
        }

        // If not pending, throw error
        if (!"pending".equals(photo.getStatus())) {
            throw new PhotoAlreadyConfirmedException(photoId);
        }

        String uploadedAt = Instant.now().toString();

        try {
            // Update photo status only (no transaction, no PhotoCount increment)
            Map<String, AttributeValue> photoKey = new HashMap<>();
            photoKey.put("PhotoID", AttributeValue.builder().s(photoId).build());

            Map<String, AttributeValue> photoExpressionValues = new HashMap<>();
            photoExpressionValues.put(":uploaded", AttributeValue.builder().s("uploaded").build());
            photoExpressionValues.put(":pending", AttributeValue.builder().s("pending").build());
            photoExpressionValues.put(":s3Key", AttributeValue.builder().s(s3Key).build());
            photoExpressionValues.put(":uploadedAt", AttributeValue.builder().s(uploadedAt).build());

            UpdateItemRequest updateRequest = UpdateItemRequest.builder()
                    .tableName(photosTableName)
                    .key(photoKey)
                    .updateExpression("SET #status = :uploaded, S3Key = :s3Key, UploadedAt = :uploadedAt")
                    .conditionExpression("#status = :pending")
                    .expressionAttributeNames(Map.of("#status", "Status"))
                    .expressionAttributeValues(photoExpressionValues)
                    .build();

            dynamoDbClient.updateItem(updateRequest);

            // Construct photo URL
            String photoUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);

            logger.debug("Confirmed upload status for photoId: {}, propertyId: {}", photoId, propertyId);

            return new ConfirmUploadResponse(photoId, photoUrl, "uploaded");

        } catch (software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException e) {
            // Conditional check failed - photo is no longer pending
            logger.warn("Conditional check failed confirming photo {}: {}", photoId, e.getMessage());
            throw new PhotoAlreadyConfirmedException(photoId);
        } catch (Exception e) {
            logger.error("Unexpected error confirming upload status for photoId {}: {}", photoId, e.getMessage(), e);
            throw new RuntimeException("Failed to confirm upload status: " + photoId, e);
        }
    }

    /**
     * Confirms upload using DynamoDB transaction to atomically:
     * 1. Update photo status from 'pending' to 'uploaded' with conditional write
     * 2. Atomically increment property photo count
     * 
     * This ensures idempotency and prevents race conditions.
     * NOTE: This method causes transaction conflicts when used in parallel. Use confirmUploadStatus() instead.
     */
    public ConfirmUploadResponse confirmUpload(String photoId, String propertyId, String s3Key) {
        // First verify photo exists and get current state
        Photo photo = photoRepository.getPhoto(photoId);
        
        // Verify propertyId matches
        if (!propertyId.equals(photo.getPropertyId())) {
            throw new IllegalArgumentException("Property ID mismatch: expected " + photo.getPropertyId() + ", got " + propertyId);
        }

        // If already uploaded, return success (idempotency)
        if ("uploaded".equals(photo.getStatus())) {
            logger.info("Photo already confirmed (idempotent): photoId={}", photoId);
            String photoUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);
            return new ConfirmUploadResponse(photoId, photoUrl, "uploaded");
        }

        // If not pending, throw error
        if (!"pending".equals(photo.getStatus())) {
            throw new PhotoAlreadyConfirmedException(photoId);
        }

        String uploadedAt = Instant.now().toString();

        try {
            // Build transactional write with two operations:
            // 1. Conditionally update photo (only if status is still 'pending')
            Map<String, AttributeValue> photoKey = new HashMap<>();
            photoKey.put("PhotoID", AttributeValue.builder().s(photoId).build());

            Map<String, AttributeValue> photoExpressionValues = new HashMap<>();
            photoExpressionValues.put(":uploaded", AttributeValue.builder().s("uploaded").build());
            photoExpressionValues.put(":pending", AttributeValue.builder().s("pending").build());
            photoExpressionValues.put(":s3Key", AttributeValue.builder().s(s3Key).build());
            photoExpressionValues.put(":uploadedAt", AttributeValue.builder().s(uploadedAt).build());

            Update photoUpdate = Update.builder()
                    .tableName(photosTableName)
                    .key(photoKey)
                    .updateExpression("SET #status = :uploaded, S3Key = :s3Key, UploadedAt = :uploadedAt")
                    .conditionExpression("#status = :pending")
                    .expressionAttributeNames(Map.of("#status", "Status"))
                    .expressionAttributeValues(photoExpressionValues)
                    .build();

            // 2. Atomically increment property photo count
            Map<String, AttributeValue> propertyKey = new HashMap<>();
            propertyKey.put("PropertyID", AttributeValue.builder().s(propertyId).build());

            Map<String, AttributeValue> propertyExpressionValues = new HashMap<>();
            propertyExpressionValues.put(":inc", AttributeValue.builder().n("1").build());

            Update propertyUpdate = Update.builder()
                    .tableName(propertiesTableName)
                    .key(propertyKey)
                    .updateExpression("ADD PhotoCount :inc")
                    .conditionExpression("attribute_exists(PropertyID)")
                    .expressionAttributeValues(propertyExpressionValues)
                    .build();

            // Execute transaction
            TransactWriteItemsRequest request = TransactWriteItemsRequest.builder()
                    .transactItems(
                            TransactWriteItem.builder().update(photoUpdate).build(),
                            TransactWriteItem.builder().update(propertyUpdate).build()
                    )
                    .build();

            dynamoDbClient.transactWriteItems(request);

            // Construct photo URL
            String photoUrl = String.format("https://%s.s3.%s.amazonaws.com/%s", bucketName, region, s3Key);

            logger.info("Confirmed upload (transactional) for photoId: {}, propertyId: {}", photoId, propertyId);

            return new ConfirmUploadResponse(photoId, photoUrl, "uploaded");

        } catch (software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException e) {
            // Conditional check failed - photo is no longer pending
            logger.warn("Conditional check failed confirming photo {}: {}", photoId, e.getMessage());
            throw new PhotoAlreadyConfirmedException(photoId);
        } catch (software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException e) {
            // Transaction was canceled - check cancellation reasons
            logger.error("Transaction canceled confirming photo {}: {}", photoId, e.getMessage());
            throw new ConditionalCheckFailedException("Transaction failed when confirming upload: " + photoId, e);
        } catch (Exception e) {
            logger.error("Unexpected error confirming upload for photoId {}: {}", photoId, e.getMessage(), e);
            throw new RuntimeException("Failed to confirm upload: " + photoId, e);
        }
    }

    /**
     * Batch confirm uploads with property-grouped processing to avoid transaction conflicts
     * Groups photos by propertyId and processes each property in parallel batches to improve performance
     * while still avoiding transaction conflicts when updating property PhotoCount
     */
    public Map<String, ConfirmUploadResponse> batchConfirmUpload(List<String> photoIds, List<String> propertyIds, List<String> s3Keys) {
        logger.info("Batch confirming {} uploads", photoIds.size());
        
        if (photoIds.size() != propertyIds.size() || photoIds.size() != s3Keys.size()) {
            throw new IllegalArgumentException("Arrays must be same length");
        }

        Map<String, ConfirmUploadResponse> results = new HashMap<>();
        
        // Group photos by propertyId to avoid transaction conflicts
        Map<String, List<Integer>> propertyGroups = new HashMap<>();
        for (int i = 0; i < propertyIds.size(); i++) {
            String propertyId = propertyIds.get(i);
            propertyGroups.computeIfAbsent(propertyId, k -> new ArrayList<>()).add(i);
        }
        
        logger.debug("Grouped {} photos into {} properties", photoIds.size(), propertyGroups.size());
        
        // Process each property's photos SEQUENTIALLY to avoid transaction conflicts
        // Process different properties in parallel, but photos within each property sequentially
        // This prevents TransactionConflict errors when multiple photos try to increment the same property's PhotoCount
        List<CompletableFuture<Void>> propertyFutures = new ArrayList<>();
        
        for (Map.Entry<String, List<Integer>> entry : propertyGroups.entrySet()) {
            String propertyId = entry.getKey();
            List<Integer> indices = entry.getValue();
            
            CompletableFuture<Void> propertyFuture = CompletableFuture.runAsync(() -> {
                // Process photos for this property SEQUENTIALLY (one at a time)
                // This is necessary because each confirmation increments the property's PhotoCount
                // and DynamoDB transactions can't handle concurrent updates to the same item
                for (Integer index : indices) {
                    String photoId = photoIds.get(index);
                    String s3Key = s3Keys.get(index);
                    
                    try {
                        ConfirmUploadResponse response = confirmUpload(photoId, propertyId, s3Key);
                        synchronized (results) {
                            results.put(photoId, response);
                        }
                    } catch (Exception e) {
                        logger.error("Failed to confirm upload for photoId {}: {}", photoId, e.getMessage());
                        synchronized (results) {
                            ConfirmUploadResponse errorResponse = new ConfirmUploadResponse();
                            errorResponse.setPhotoId(photoId);
                            errorResponse.setStatus("failed");
                            results.put(photoId, errorResponse);
                        }
                    }
                }
            }, executorService);
            
            propertyFutures.add(propertyFuture);
        }
        
        // Wait for all properties to complete
        CompletableFuture.allOf(propertyFutures.toArray(new CompletableFuture[0])).join();

        long successCount = results.values().stream()
            .filter(r -> r != null && "uploaded".equals(r.getStatus()))
            .count();
        
        logger.info("Batch confirmed {}/{} uploads successfully", successCount, photoIds.size());

        return results;
    }

    /**
     * Delete a single photo and its associated data (S3 object, analysis results)
     */
    public void deletePhoto(String photoId) {
        Photo photo = photoRepository.getPhoto(photoId);

        logger.info("Deleting photo: {}", photoId);

        // Delete S3 object
        if (photo.getS3Key() != null) {
            s3Service.deleteObject(photo.getS3Key());
        }

        // Delete analysis result if exists
        AnalysisResult analysis = analysisRepository.getAnalysisByPhotoId(photoId);
        if (analysis != null) {
            analysisRepository.deleteAnalysis(analysis.getAnalysisId());
        }

        // Delete photo record
        photoRepository.deletePhoto(photoId);

        // Decrement property photo count
        if (photo.getPropertyId() != null) {
            propertyRepository.updatePhotoCount(photo.getPropertyId(), -1);
        }

        logger.info("Successfully deleted photo: {}", photoId);
    }

    /**
     * Batch delete photos and their associated data (S3 objects, analysis results)
     * Uses batch operations for performance.
     */
    public int batchDeletePhotos(List<String> photoIds) {
        if (photoIds == null || photoIds.isEmpty()) {
            return 0;
        }

        logger.info("Batch deleting {} photos", photoIds.size());

        // Fetch all photos to get S3 keys and property IDs
        Map<String, Photo> photos = photoRepository.batchGetPhotos(photoIds);

        // Collect S3 keys for batch deletion
        List<String> s3Keys = photos.values().stream()
                .map(Photo::getS3Key)
                .filter(key -> key != null)
                .collect(Collectors.toList());

        // Batch delete S3 objects
        if (!s3Keys.isEmpty()) {
            s3Service.deleteObjects(s3Keys);
        }

        // Delete analysis results for each photo
        List<String> analysisIds = new ArrayList<>();
        for (String photoId : photoIds) {
            AnalysisResult analysis = analysisRepository.getAnalysisByPhotoId(photoId);
            if (analysis != null) {
                analysisIds.add(analysis.getAnalysisId());
            }
        }
        if (!analysisIds.isEmpty()) {
            analysisRepository.batchDeleteAnalysis(analysisIds);
        }

        // Batch delete photo records
        photoRepository.batchDeletePhotos(photoIds);

        // Update property photo counts (grouped by property)
        Map<String, Integer> propertyDecrements = new HashMap<>();
        for (Photo photo : photos.values()) {
            if (photo.getPropertyId() != null) {
                propertyDecrements.merge(photo.getPropertyId(), 1, Integer::sum);
            }
        }
        for (Map.Entry<String, Integer> entry : propertyDecrements.entrySet()) {
            try {
                propertyRepository.updatePhotoCount(entry.getKey(), -entry.getValue());
            } catch (Exception e) {
                logger.error("Failed to update photo count for property {}: {}", entry.getKey(), e.getMessage());
            }
        }

        logger.info("Successfully batch deleted {} photos", photoIds.size());
        return photoIds.size();
    }
}


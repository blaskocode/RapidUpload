package com.rapidupload.backend.repositories;

import com.rapidupload.backend.exceptions.ConditionalCheckFailedException;
import com.rapidupload.backend.exceptions.PhotoNotFoundException;
import com.rapidupload.backend.models.PagedResponse;
import com.rapidupload.backend.models.Photo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbIndex;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.WriteBatch;
import software.amazon.awssdk.enhanced.dynamodb.model.BatchWriteItemEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class PhotoRepository {

    private static final Logger logger = LoggerFactory.getLogger(PhotoRepository.class);
    private static final int MAX_RETRIES = 3;
    private static final long BASE_DELAY_MS = 1000;
    private static final int BATCH_WRITE_SIZE = 25; // DynamoDB batch write limit

    private final DynamoDbTable<Photo> photoTable;
    private final DynamoDbEnhancedClient enhancedClient;

    public PhotoRepository(DynamoDbEnhancedClient enhancedClient,
                           @Value("${aws.dynamodb.tables.photos}") String tableName) {
        this.enhancedClient = enhancedClient;
        this.photoTable = enhancedClient.table(tableName, TableSchema.fromBean(Photo.class));
    }

    public Photo createPhoto(String photoId, String propertyId, String filename, String s3Key, String s3Bucket,
                             Long fileSize, String contentType) {
        Photo photo = new Photo();
        photo.setPhotoId(photoId);
        photo.setPropertyId(propertyId);
        photo.setFilename(filename);
        photo.setS3Key(s3Key);
        photo.setS3Bucket(s3Bucket);
        photo.setUploadedAt(Instant.now());
        photo.setFileSize(fileSize);
        photo.setStatus("pending");
        photo.setContentType(contentType);

        return executeWithRetry(() -> {
            photoTable.putItem(photo);
            logger.info("Created photo: {}", photo.getPhotoId());
            return photo;
        }, "createPhoto");
    }

    public Photo getPhoto(String photoId) {
        try {
            Key key = Key.builder()
                    .partitionValue(photoId)
                    .build();
            Photo photo = photoTable.getItem(key);
            if (photo == null) {
                throw new PhotoNotFoundException(photoId);
            }
            logger.debug("Retrieved photo: {}", photoId);
            return photo;
        } catch (PhotoNotFoundException e) {
            throw e;
        } catch (ResourceNotFoundException e) {
            logger.error("Photo table not found: {}", photoId);
            throw new PhotoNotFoundException(photoId);
        } catch (DynamoDbException e) {
            if (e.getMessage() != null && e.getMessage().contains("ValidationException")) {
                logger.error("Validation error getting photo: {}", photoId, e);
                throw new IllegalArgumentException("Invalid photo ID", e);
            }
            logger.error("DynamoDB error getting photo: {}", photoId, e);
            throw new RuntimeException("Failed to get photo: " + photoId, e);
        }
    }

    public void updatePhoto(Photo photo) {
        try {
            executeWithRetry(() -> {
                photoTable.updateItem(photo);
                logger.info("Updated photo: {}", photo.getPhotoId());
                return null;
            }, "updatePhoto");
        } catch (software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException e) {
            logger.error("Conditional check failed updating photo: {}", photo.getPhotoId(), e);
            throw new ConditionalCheckFailedException("Conditional check failed when updating photo: " + photo.getPhotoId(), e);
        } catch (Exception e) {
            logger.error("Failed to update photo: {}", photo.getPhotoId(), e);
            throw new RuntimeException("Failed to update photo: " + photo.getPhotoId(), e);
        }
    }

    public void updatePhotoStatus(String photoId, String status) {
        try {
            Photo photo = getPhoto(photoId);
            photo.setStatus(status);
            updatePhoto(photo);
        } catch (PhotoNotFoundException e) {
            throw e;
        }
    }

    public void deletePhoto(String photoId) {
        try {
            Key key = Key.builder()
                    .partitionValue(photoId)
                    .build();
            photoTable.deleteItem(key);
        } catch (DynamoDbException e) {
            throw new RuntimeException("Failed to delete photo: " + photoId, e);
        }
    }

    public PagedResponse<Photo> listPhotosByProperty(String propertyId, Integer limit, Map<String, String> exclusiveStartKey) {
        try {
            // Default page size is 50, maximum is 100
            int pageSize = limit != null ? Math.min(Math.max(limit, 1), 100) : 50;

            DynamoDbIndex<Photo> gsi = photoTable.index("PropertyID-index");

            QueryEnhancedRequest.Builder queryBuilder = QueryEnhancedRequest.builder()
                    .queryConditional(QueryConditional.keyEqualTo(Key.builder()
                            .partitionValue(propertyId)
                            .build()))
                    .limit(pageSize);

            // Handle pagination - For GSI queries, exclusiveStartKey must include:
            // 1. The GSI partition key (PropertyID) 
            // 2. The base table partition key (PhotoID)
            if (exclusiveStartKey != null && !exclusiveStartKey.isEmpty() && exclusiveStartKey.containsKey("PhotoID")) {
                // Reconstruct the key map from the last evaluated key
                // For GSI queries, we need both PropertyID and PhotoID
                Map<String, AttributeValue> startKeyMap = new HashMap<>();
                
                // Always include PropertyID (GSI partition key) - required for GSI queries
                startKeyMap.put("PropertyID", AttributeValue.builder().s(propertyId).build());
                
                // Include PhotoID (base table partition key) from the last evaluated key
                startKeyMap.put("PhotoID", AttributeValue.builder().s(exclusiveStartKey.get("PhotoID")).build());
                
                queryBuilder.exclusiveStartKey(startKeyMap);
            }

            var result = gsi.query(queryBuilder.build());
            List<Photo> photos = new ArrayList<>();
            
            // Process the first page of results
            var pageIterator = result.iterator();
            if (pageIterator.hasNext()) {
                var page = pageIterator.next();
                page.items().forEach(photos::add);
                
                // Check if there are more items
                boolean hasMore = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty();
                Map<String, String> lastKey = null;
                if (hasMore && page.lastEvaluatedKey() != null) {
                    lastKey = new HashMap<>();
                    // The lastEvaluatedKey from GSI query contains both PropertyID and PhotoID
                    // We only need to store PhotoID since PropertyID is already known from the query
                    AttributeValue photoIdAttr = page.lastEvaluatedKey().get("PhotoID");
                    if (photoIdAttr != null && photoIdAttr.s() != null) {
                        lastKey.put("PhotoID", photoIdAttr.s());
                    }
                }
                
                return new PagedResponse<>(photos, lastKey, hasMore);
            }
            
            return new PagedResponse<>(photos, null, false);
        } catch (DynamoDbException e) {
            if (e.getMessage() != null && e.getMessage().contains("ValidationException")) {
                logger.error("Validation error listing photos for property: {}", propertyId, e);
                throw new IllegalArgumentException("Invalid request parameters", e);
            }
            logger.error("DynamoDB error listing photos for property: {}", propertyId, e);
            throw new RuntimeException("Failed to list photos for property: " + propertyId, e);
        }
    }

    /**
     * Batch create photos in DynamoDB
     * Automatically chunks into batches of 25 (DynamoDB limit)
     */
    public List<Photo> batchCreatePhotos(List<Photo> photos) {
        if (photos.isEmpty()) {
            return new ArrayList<>();
        }

        logger.info("Batch creating {} photos", photos.size());
        List<Photo> createdPhotos = new ArrayList<>();

        // Split into chunks of 25
        for (int i = 0; i < photos.size(); i += BATCH_WRITE_SIZE) {
            int end = Math.min(i + BATCH_WRITE_SIZE, photos.size());
            List<Photo> batch = photos.subList(i, end);
            final int batchNumber = (i / BATCH_WRITE_SIZE) + 1;
            final int totalBatches = (photos.size() + BATCH_WRITE_SIZE - 1) / BATCH_WRITE_SIZE;

            executeWithRetry(() -> {
                WriteBatch.Builder<Photo> writeBatchBuilder = WriteBatch.builder(Photo.class)
                        .mappedTableResource(photoTable);

                for (Photo photo : batch) {
                    writeBatchBuilder.addPutItem(photo);
                }

                BatchWriteItemEnhancedRequest batchRequest = BatchWriteItemEnhancedRequest.builder()
                        .writeBatches(writeBatchBuilder.build())
                        .build();

                enhancedClient.batchWriteItem(batchRequest);
                logger.debug("Batch wrote {} photos (batch {}/{})", 
                    batch.size(), batchNumber, totalBatches);
                return null;
            }, "batchCreatePhotos");

            createdPhotos.addAll(batch);
        }

        logger.info("Successfully batch created {} photos", createdPhotos.size());
        return createdPhotos;
    }

    /**
     * Batch get photos by IDs
     */
    public Map<String, Photo> batchGetPhotos(List<String> photoIds) {
        if (photoIds.isEmpty()) {
            return new HashMap<>();
        }

        Map<String, Photo> photos = new HashMap<>();
        
        // Split into chunks of 100 (DynamoDB batch get limit)
        for (int i = 0; i < photoIds.size(); i += 100) {
            int end = Math.min(i + 100, photoIds.size());
            List<String> batch = photoIds.subList(i, end);

            // Create batch get request
            software.amazon.awssdk.enhanced.dynamodb.model.BatchGetItemEnhancedRequest.Builder requestBuilder = 
                software.amazon.awssdk.enhanced.dynamodb.model.BatchGetItemEnhancedRequest.builder();

            software.amazon.awssdk.enhanced.dynamodb.model.ReadBatch.Builder<Photo> readBatchBuilder = 
                software.amazon.awssdk.enhanced.dynamodb.model.ReadBatch.builder(Photo.class)
                    .mappedTableResource(photoTable);

            for (String photoId : batch) {
                readBatchBuilder.addGetItem(Key.builder().partitionValue(photoId).build());
            }

            requestBuilder.addReadBatch(readBatchBuilder.build());

            var batchGetResult = enhancedClient.batchGetItem(requestBuilder.build());

            batchGetResult.resultsForTable(photoTable).forEach(photo -> 
                photos.put(photo.getPhotoId(), photo));
        }

        return photos;
    }

    private <T> T executeWithRetry(java.util.function.Supplier<T> operation, String operationName) {
        int attempt = 0;
        while (attempt < MAX_RETRIES) {
            try {
                return operation.get();
            } catch (ProvisionedThroughputExceededException e) {
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    logger.error("Max retries exceeded for {} after {} attempts", operationName, MAX_RETRIES);
                    throw e;
                }
                long delay = BASE_DELAY_MS * (long) Math.pow(2, attempt - 1);
                logger.warn("Throughput exceeded for {}, retrying in {}ms (attempt {}/{})", 
                        operationName, delay, attempt, MAX_RETRIES);
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Retry interrupted", ie);
                }
            }
        }
        throw new RuntimeException("Operation failed after retries: " + operationName);
    }
}


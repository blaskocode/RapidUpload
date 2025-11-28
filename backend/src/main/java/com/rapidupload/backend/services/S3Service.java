package com.rapidupload.backend.services;

import com.rapidupload.backend.dto.PresignedUrlResponse;
import com.rapidupload.backend.utils.FilenameSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.Delete;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectsResponse;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.ObjectIdentifier;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class S3Service {

    private static final Logger logger = LoggerFactory.getLogger(S3Service.class);
    private static final int PRESIGNED_URL_EXPIRATION_MINUTES = 15;

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final String bucketName;

    public S3Service(S3Client s3Client, S3Presigner s3Presigner, @Value("${aws.s3.bucket-name}") String bucketName) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
    }

    public String getBucketName() {
        return bucketName;
    }

    /**
     * Get object metadata from S3 including file size and content type.
     * Returns null if the object doesn't exist.
     */
    public HeadObjectResponse getObjectMetadata(String s3Key) {
        try {
            HeadObjectRequest request = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            return s3Client.headObject(request);
        } catch (NoSuchKeyException e) {
            logger.warn("Object not found in S3: {}", s3Key);
            return null;
        } catch (Exception e) {
            logger.error("Error getting object metadata for {}: {}", s3Key, e.getMessage());
            return null;
        }
    }

    /**
     * Get file size from S3 for a given key.
     * Returns null if the object doesn't exist or an error occurs.
     */
    public Long getObjectSize(String s3Key) {
        HeadObjectResponse response = getObjectMetadata(s3Key);
        return response != null ? response.contentLength() : null;
    }

    public PresignedUrlResponse generatePresignedUrl(String photoId, String propertyId, String filename, String contentType, Long fileSize) {

        // Sanitize filename
        String sanitizedFilename = FilenameSanitizer.sanitize(filename);

        // Construct S3 key: properties/{propertyId}/{photoId}-{sanitizedFilename}
        String s3Key = String.format("properties/%s/%s-%s", propertyId, photoId, sanitizedFilename);

        // Create PutObjectRequest
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(s3Key)
                .contentType(contentType)
                .contentLength(fileSize)
                .build();

        // Generate presigned URL with 15-minute expiration
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(PRESIGNED_URL_EXPIRATION_MINUTES))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = s3Presigner.presignPutObject(presignRequest);
        String presignedUrl = presignedRequest.url().toString();

        // Build fields map
        Map<String, String> fields = new HashMap<>();
        fields.put("key", s3Key);

        logger.info("Generated presigned URL for photoId: {}, s3Key: {}", photoId, s3Key);

        return new PresignedUrlResponse(
                photoId,
                presignedUrl,
                PRESIGNED_URL_EXPIRATION_MINUTES * 60, // expiresIn in seconds
                fields
        );
    }

    /**
     * Delete an object from S3.
     * @param s3Key The key of the object to delete
     */
    public void deleteObject(String s3Key) {
        try {
            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            s3Client.deleteObject(request);
            logger.info("Deleted object from S3: {}", s3Key);
        } catch (Exception e) {
            logger.error("Error deleting object from S3 {}: {}", s3Key, e.getMessage());
            // Don't throw - deletion should be best-effort
        }
    }

    /**
     * Batch delete objects from S3. S3 supports up to 1000 objects per request.
     * @param s3Keys List of keys to delete
     * @return Number of successfully deleted objects
     */
    public int deleteObjects(List<String> s3Keys) {
        if (s3Keys == null || s3Keys.isEmpty()) {
            return 0;
        }

        int totalDeleted = 0;
        int batchSize = 1000; // S3 limit

        for (int i = 0; i < s3Keys.size(); i += batchSize) {
            List<String> batch = s3Keys.subList(i, Math.min(i + batchSize, s3Keys.size()));

            try {
                List<ObjectIdentifier> objectIds = new ArrayList<>();
                for (String key : batch) {
                    objectIds.add(ObjectIdentifier.builder().key(key).build());
                }

                DeleteObjectsRequest request = DeleteObjectsRequest.builder()
                        .bucket(bucketName)
                        .delete(Delete.builder().objects(objectIds).quiet(true).build())
                        .build();

                DeleteObjectsResponse response = s3Client.deleteObjects(request);
                int deleted = batch.size() - (response.errors() != null ? response.errors().size() : 0);
                totalDeleted += deleted;

                if (response.errors() != null && !response.errors().isEmpty()) {
                    logger.warn("Some S3 deletions failed: {} errors", response.errors().size());
                }

                logger.info("Batch deleted {} objects from S3", deleted);
            } catch (Exception e) {
                logger.error("Error batch deleting objects from S3: {}", e.getMessage());
                // Don't throw - deletion should be best-effort
            }
        }

        return totalDeleted;
    }
}


package com.rapidupload.backend.services;

import com.rapidupload.backend.dto.PresignedUrlResponse;
import com.rapidupload.backend.utils.FilenameSanitizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class S3Service {

    private static final Logger logger = LoggerFactory.getLogger(S3Service.class);
    private static final int PRESIGNED_URL_EXPIRATION_MINUTES = 15;

    private final S3Presigner s3Presigner;
    private final String bucketName;

    public S3Service(S3Presigner s3Presigner, @Value("${aws.s3.bucket-name}") String bucketName) {
        this.s3Presigner = s3Presigner;
        this.bucketName = bucketName;
    }

    public String getBucketName() {
        return bucketName;
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
}


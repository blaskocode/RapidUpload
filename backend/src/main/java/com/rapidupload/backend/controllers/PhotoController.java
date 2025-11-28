package com.rapidupload.backend.controllers;

import com.rapidupload.backend.dto.*;
import com.rapidupload.backend.exceptions.PropertyNotFoundException;
import com.rapidupload.backend.models.Photo;
import com.rapidupload.backend.repositories.PhotoRepository;
import com.rapidupload.backend.repositories.PropertyRepository;
import com.rapidupload.backend.services.PhotoService;
import com.rapidupload.backend.services.S3Service;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/photos")
public class PhotoController {

    private static final Logger logger = LoggerFactory.getLogger(PhotoController.class);

    private final S3Service s3Service;
    private final PhotoService photoService;
    private final PhotoRepository photoRepository;
    private final PropertyRepository propertyRepository;

    public PhotoController(S3Service s3Service, PhotoService photoService,
                          PhotoRepository photoRepository, PropertyRepository propertyRepository) {
        this.s3Service = s3Service;
        this.photoService = photoService;
        this.photoRepository = photoRepository;
        this.propertyRepository = propertyRepository;
    }

    @PostMapping("/presigned-url")
    public ResponseEntity<PresignedUrlResponse> generatePresignedUrl(@Valid @RequestBody PresignedUrlRequest request) {
        try {
            logger.debug("Generating presigned URL for file: {} (size: {} bytes)", 
                request.getFilename(), request.getFileSize());
            
            // Validate file size
            request.validateFileSize();

            // Verify property exists
            propertyRepository.getProperty(request.getPropertyId());

            // Generate UUID for photoId first
            String photoId = java.util.UUID.randomUUID().toString();

            // Generate presigned URL
            PresignedUrlResponse response = s3Service.generatePresignedUrl(
                    photoId,
                    request.getPropertyId(),
                    request.getFilename(),
                    request.getContentType(),
                    request.getFileSize()
            );

            // Create photo record in pending state
            photoRepository.createPhoto(
                    photoId,
                    request.getPropertyId(),
                    request.getFilename(),
                    response.getFields().get("key"),
                    s3Service.getBucketName(),
                    request.getFileSize(),
                    request.getContentType()
            );

            logger.debug("Successfully generated presigned URL for photoId: {}", photoId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error generating presigned URL for file: {}", request.getFilename(), e);
            throw e;
        }
    }

    @PostMapping("/confirm")
    public ResponseEntity<ConfirmUploadResponse> confirmUpload(@Valid @RequestBody ConfirmUploadRequest request) {
        try {
            logger.debug("Confirming upload for photoId: {}", request.getPhotoId());
            
            // Validate s3Key matches expected pattern and propertyId
            String expectedPropertyId = extractPropertyIdFromS3Key(request.getS3Key());
            if (!request.getPropertyId().equals(expectedPropertyId)) {
                throw new IllegalArgumentException("Property ID in request does not match S3 key");
            }

            ConfirmUploadResponse response = photoService.confirmUpload(
                    request.getPhotoId(),
                    request.getPropertyId(),
                    request.getS3Key()
            );

            logger.debug("Successfully confirmed upload for photoId: {}", request.getPhotoId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error confirming upload for photoId: {}", request.getPhotoId(), e);
            throw e;
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Photo> getPhoto(@PathVariable String id) {
        Photo photo = photoRepository.getPhoto(id);
        return ResponseEntity.ok(photo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePhoto(@PathVariable String id) {
        logger.info("Deleting photo: {}", id);
        photoService.deletePhoto(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/delete/batch")
    public ResponseEntity<Map<String, Object>> batchDeletePhotos(@RequestBody Map<String, List<String>> request) {
        List<String> photoIds = request.get("photoIds");
        if (photoIds == null || photoIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "photoIds is required"));
        }

        logger.info("Batch deleting {} photos", photoIds.size());
        int deletedCount = photoService.batchDeletePhotos(photoIds);

        return ResponseEntity.ok(Map.of(
            "deletedCount", deletedCount,
            "requestedCount", photoIds.size()
        ));
    }

    @PostMapping("/confirm-status")
    public ResponseEntity<ConfirmUploadResponse> confirmUploadStatus(@Valid @RequestBody ConfirmUploadRequest request) {
        try {
            logger.debug("Confirming upload status for photoId: {}", request.getPhotoId());
            
            // Validate s3Key matches expected pattern and propertyId
            String expectedPropertyId = extractPropertyIdFromS3Key(request.getS3Key());
            if (!request.getPropertyId().equals(expectedPropertyId)) {
                throw new IllegalArgumentException("Property ID in request does not match S3 key");
            }

            ConfirmUploadResponse response = photoService.confirmUploadStatus(
                    request.getPhotoId(),
                    request.getPropertyId(),
                    request.getS3Key()
            );

            logger.debug("Successfully confirmed upload status for photoId: {}", request.getPhotoId());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error confirming upload status for photoId: {}", request.getPhotoId(), e);
            throw e;
        }
    }

    @PostMapping("/presigned-urls/batch")
    public ResponseEntity<BatchPresignedUrlResponse> generateBatchPresignedUrls(
            @Valid @RequestBody BatchPresignedUrlRequest request) {
        try {
            logger.info("Generating batch presigned URLs: {} files for property {}", 
                request.getFiles().size(), request.getPropertyId());
            
            // Verify property exists
            propertyRepository.getProperty(request.getPropertyId());
            
            List<PresignedUrlResponse> responses = new ArrayList<>();
            List<Photo> photosToCreate = new ArrayList<>();
            
            // Generate URLs and prepare photo records
            for (BatchPresignedUrlRequest.FileMetadata file : request.getFiles()) {
                // Validate file size
                file.validateFileSize();
                
                // Generate UUID for photoId
                String photoId = UUID.randomUUID().toString();
                
                // Generate presigned URL
                PresignedUrlResponse response = s3Service.generatePresignedUrl(
                        photoId,
                        request.getPropertyId(),
                        file.getFilename(),
                        file.getContentType(),
                        file.getFileSize()
                );
                responses.add(response);
                
                // Prepare photo record
                Photo photo = new Photo();
                photo.setPhotoId(photoId);
                photo.setPropertyId(request.getPropertyId());
                photo.setFilename(file.getFilename());
                photo.setS3Key(response.getFields().get("key"));
                photo.setS3Bucket(s3Service.getBucketName());
                photo.setFileSize(file.getFileSize());
                photo.setContentType(file.getContentType());
                photo.setStatus("pending");
                photo.setUploadedAt(java.time.Instant.now());
                photosToCreate.add(photo);
            }
            
            // Batch create all photo records in DynamoDB
            photoRepository.batchCreatePhotos(photosToCreate);
            
            BatchPresignedUrlResponse batchResponse = new BatchPresignedUrlResponse(
                    responses,
                    request.getFiles().size(),
                    responses.size()
            );
            
            logger.info("Successfully generated {} presigned URLs", responses.size());
            return ResponseEntity.ok(batchResponse);
            
        } catch (Exception e) {
            logger.error("Error generating batch presigned URLs", e);
            throw e;
        }
    }

    @PostMapping("/confirm/batch")
    public ResponseEntity<BatchConfirmResponse> confirmBatchUpload(
            @Valid @RequestBody BatchConfirmRequest request) {
        try {
            logger.info("Confirming batch upload: {} photos", request.getConfirmations().size());
            
            // Validate all requests first
            for (ConfirmUploadRequest confirmation : request.getConfirmations()) {
                String expectedPropertyId = extractPropertyIdFromS3Key(confirmation.getS3Key());
                if (!confirmation.getPropertyId().equals(expectedPropertyId)) {
                    throw new IllegalArgumentException(
                        "Property ID mismatch for photo " + confirmation.getPhotoId());
                }
            }
            
            // Extract lists for batch processing
            List<String> photoIds = request.getConfirmations().stream()
                    .map(ConfirmUploadRequest::getPhotoId)
                    .collect(Collectors.toList());
            List<String> propertyIds = request.getConfirmations().stream()
                    .map(ConfirmUploadRequest::getPropertyId)
                    .collect(Collectors.toList());
            List<String> s3Keys = request.getConfirmations().stream()
                    .map(ConfirmUploadRequest::getS3Key)
                    .collect(Collectors.toList());
            
            // Process batch confirmations
            Map<String, ConfirmUploadResponse> results = photoService.batchConfirmUpload(
                    photoIds, propertyIds, s3Keys);
            
            // Build response
            BatchConfirmResponse response = new BatchConfirmResponse();
            response.setTotalRequested(request.getConfirmations().size());
            
            List<ConfirmUploadResponse> successful = new ArrayList<>();
            List<BatchConfirmResponse.FailedConfirmation> failed = new ArrayList<>();
            
            for (Map.Entry<String, ConfirmUploadResponse> entry : results.entrySet()) {
                if ("uploaded".equals(entry.getValue().getStatus())) {
                    successful.add(entry.getValue());
                } else {
                    failed.add(new BatchConfirmResponse.FailedConfirmation(
                            entry.getKey(), "Confirmation failed"));
                }
            }
            
            response.setSuccessful(successful);
            response.setFailed(failed);
            response.setTotalConfirmed(successful.size());
            response.setTotalFailed(failed.size());
            
            logger.info("Batch confirmation completed: {}/{} successful", 
                successful.size(), request.getConfirmations().size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error confirming batch upload", e);
            throw e;
        }
    }

    private String extractPropertyIdFromS3Key(String s3Key) {
        // s3Key format: properties/{propertyId}/{photoId}-{filename}
        String[] parts = s3Key.split("/");
        if (parts.length >= 2 && "properties".equals(parts[0])) {
            return parts[1];
        }
        throw new IllegalArgumentException("Invalid S3 key format: " + s3Key);
    }
}


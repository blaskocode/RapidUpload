package com.rapidupload.backend.services;

import com.rapidupload.backend.dto.CreatePropertyRequest;
import com.rapidupload.backend.dto.PagedPhotoResponse;
import com.rapidupload.backend.dto.PhotoResponse;
import com.rapidupload.backend.dto.PropertyResponse;
import com.rapidupload.backend.exceptions.PropertyNotFoundException;
import com.rapidupload.backend.models.AnalysisResult;
import com.rapidupload.backend.models.PagedResponse;
import com.rapidupload.backend.models.Photo;
import com.rapidupload.backend.models.Property;
import com.rapidupload.backend.repositories.AnalysisRepository;
import com.rapidupload.backend.repositories.PhotoRepository;
import com.rapidupload.backend.repositories.PropertyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PropertyService {

    private static final Logger logger = LoggerFactory.getLogger(PropertyService.class);

    private final PropertyRepository propertyRepository;
    private final PhotoRepository photoRepository;
    private final AnalysisRepository analysisRepository;
    private final S3Service s3Service;

    public PropertyService(PropertyRepository propertyRepository, PhotoRepository photoRepository,
                          AnalysisRepository analysisRepository, S3Service s3Service) {
        this.propertyRepository = propertyRepository;
        this.photoRepository = photoRepository;
        this.analysisRepository = analysisRepository;
        this.s3Service = s3Service;
    }

    public PropertyResponse createProperty(CreatePropertyRequest request) {
        Property property = propertyRepository.createProperty(request.getName());
        return toPropertyResponse(property);
    }

    public PropertyResponse getProperty(String propertyId) {
        Property property = propertyRepository.getProperty(propertyId);
        return toPropertyResponse(property);
    }

    /**
     * Delete a property and all associated data (photos, S3 objects, analysis results)
     * Uses batch operations for performance.
     */
    public void deleteProperty(String propertyId) {
        // Verify property exists
        propertyRepository.getProperty(propertyId);

        logger.info("Deleting property: {} and all associated data", propertyId);

        // 1. Get all photos for the property
        List<Photo> photos = photoRepository.getAllPhotosByProperty(propertyId);
        logger.info("Found {} photos to delete for property: {}", photos.size(), propertyId);

        // 2. Batch delete S3 objects
        List<String> s3Keys = photos.stream()
                .map(Photo::getS3Key)
                .filter(key -> key != null)
                .collect(Collectors.toList());
        if (!s3Keys.isEmpty()) {
            s3Service.deleteObjects(s3Keys);
        }

        // 3. Batch delete photos from DynamoDB
        List<String> photoIds = photos.stream()
                .map(Photo::getPhotoId)
                .collect(Collectors.toList());
        if (!photoIds.isEmpty()) {
            photoRepository.batchDeletePhotos(photoIds);
        }

        // 4. Get and batch delete all analysis results for the property
        List<AnalysisResult> analysisResults = analysisRepository.getAllAnalysisByProperty(propertyId);
        logger.info("Found {} analysis results to delete for property: {}", analysisResults.size(), propertyId);
        List<String> analysisIds = analysisResults.stream()
                .map(AnalysisResult::getAnalysisId)
                .collect(Collectors.toList());
        if (!analysisIds.isEmpty()) {
            analysisRepository.batchDeleteAnalysis(analysisIds);
        }

        // 5. Delete the property itself
        propertyRepository.deleteProperty(propertyId);

        logger.info("Successfully deleted property: {} and all associated data", propertyId);
    }

    public List<PropertyResponse> listProperties() {
        List<Property> properties = propertyRepository.listProperties();
        return properties.stream()
                .map(this::toPropertyResponse)
                .collect(Collectors.toList());
    }

    public com.rapidupload.backend.dto.PagedPropertyResponse listPropertiesPaged(
            Integer limit, 
            Map<String, String> exclusiveStartKey) {
        com.rapidupload.backend.models.PagedResponse<Property> pagedProperties = 
                propertyRepository.listPropertiesPaged(limit, exclusiveStartKey);
        
        List<com.rapidupload.backend.dto.PropertyResponse> propertyResponses = 
                pagedProperties.getItems().stream()
                        .map(this::toPropertyResponse)
                        .collect(Collectors.toList());
        
        return new com.rapidupload.backend.dto.PagedPropertyResponse(
                propertyResponses,
                pagedProperties.getLastEvaluatedKey(),
                pagedProperties.isHasMore()
        );
    }

    public PagedPhotoResponse getPropertyPhotos(String propertyId, Integer limit, Map<String, String> exclusiveStartKey) {
        // Verify property exists
        propertyRepository.getProperty(propertyId);

        PagedResponse<Photo> pagedPhotos = photoRepository.listPhotosByProperty(propertyId, limit, exclusiveStartKey);

        // Backfill missing metadata from S3 for photos that don't have it
        for (Photo photo : pagedPhotos.getItems()) {
            if (needsMetadataBackfill(photo)) {
                backfillPhotoMetadata(photo);
            }
        }

        List<PhotoResponse> photoResponses = pagedPhotos.getItems().stream()
                .map(this::toPhotoResponse)
                .collect(Collectors.toList());

        return new PagedPhotoResponse(
                photoResponses,
                pagedPhotos.getLastEvaluatedKey(),
                pagedPhotos.isHasMore()
        );
    }

    /**
     * Check if a photo needs metadata backfill (missing fileSize, status, or contentType)
     */
    private boolean needsMetadataBackfill(Photo photo) {
        return photo.getFileSize() == null || photo.getStatus() == null || photo.getContentType() == null;
    }

    /**
     * Backfill missing photo metadata from S3 and update the database
     */
    private void backfillPhotoMetadata(Photo photo) {
        if (photo.getS3Key() == null) {
            logger.warn("Cannot backfill metadata for photo {} - no S3 key", photo.getPhotoId());
            return;
        }

        try {
            HeadObjectResponse s3Metadata = s3Service.getObjectMetadata(photo.getS3Key());
            if (s3Metadata == null) {
                logger.warn("Could not get S3 metadata for photo {}", photo.getPhotoId());
                return;
            }

            boolean updated = false;

            // Backfill file size
            if (photo.getFileSize() == null && s3Metadata.contentLength() != null) {
                photo.setFileSize(s3Metadata.contentLength());
                updated = true;
            }

            // Backfill content type
            if (photo.getContentType() == null && s3Metadata.contentType() != null) {
                photo.setContentType(s3Metadata.contentType());
                updated = true;
            }

            // Backfill status - if file exists in S3, it's uploaded
            if (photo.getStatus() == null) {
                photo.setStatus("uploaded");
                updated = true;
            }

            // Persist changes to database
            if (updated) {
                photoRepository.updatePhoto(photo);
                logger.info("Backfilled metadata for photo {}: fileSize={}, contentType={}, status={}",
                        photo.getPhotoId(), photo.getFileSize(), photo.getContentType(), photo.getStatus());
            }
        } catch (Exception e) {
            logger.error("Error backfilling metadata for photo {}: {}", photo.getPhotoId(), e.getMessage());
        }
    }

    /**
     * Recalculates and updates the PhotoCount for a property by counting all photos
     * (including those with null status from legacy uploads, or status='uploaded')
     * This is called after batch uploads complete to ensure accurate count without transaction conflicts
     */
    public PropertyResponse recalculatePhotoCount(String propertyId) {
        // Verify property exists
        Property property = propertyRepository.getProperty(propertyId);

        // Count all photos for this property (not just uploaded status)
        // Photos with null status are likely valid legacy uploads
        int totalCount = 0;
        Map<String, String> lastKey = null;

        do {
            PagedResponse<Photo> page = photoRepository.listPhotosByProperty(propertyId, 100, lastKey);
            // Count all photos - null status or 'uploaded' status are valid
            long validCount = page.getItems().stream()
                    .filter(photo -> photo.getStatus() == null || "uploaded".equals(photo.getStatus()))
                    .count();
            totalCount += (int) validCount;
            lastKey = page.getLastEvaluatedKey();
        } while (lastKey != null && !lastKey.isEmpty());

        // Update property with new count
        property.setPhotoCount(totalCount);
        propertyRepository.updateProperty(property);

        logger.info("Recalculated photo count for property {}: {}", propertyId, totalCount);
        return toPropertyResponse(property);
    }

    /**
     * Recalculates photo counts for all properties.
     * Useful for fixing incorrect counts after data migrations or bugs.
     */
    public List<PropertyResponse> recalculateAllPhotoCounts() {
        List<Property> properties = propertyRepository.listProperties();
        logger.info("Recalculating photo counts for {} properties", properties.size());

        List<PropertyResponse> results = new ArrayList<>();
        for (Property property : properties) {
            try {
                PropertyResponse updated = recalculatePhotoCount(property.getPropertyId());
                results.add(updated);
            } catch (Exception e) {
                logger.error("Failed to recalculate count for property {}: {}", property.getPropertyId(), e.getMessage());
            }
        }

        logger.info("Finished recalculating photo counts for {} properties", results.size());
        return results;
    }

    private PropertyResponse toPropertyResponse(Property property) {
        return new PropertyResponse(
                property.getPropertyId(),
                property.getName(),
                property.getCreatedAt(),
                property.getPhotoCount()
        );
    }

    private PhotoResponse toPhotoResponse(Photo photo) {
        return new PhotoResponse(
                photo.getPhotoId(),
                photo.getPropertyId(),
                photo.getFilename(),
                photo.getS3Key(),
                photo.getS3Bucket(),
                photo.getUploadedAt(),
                photo.getFileSize(),
                photo.getStatus(),
                photo.getContentType()
        );
    }
}


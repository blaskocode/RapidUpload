package com.rapidupload.backend.services;

import com.rapidupload.backend.dto.CreatePropertyRequest;
import com.rapidupload.backend.dto.PagedPhotoResponse;
import com.rapidupload.backend.dto.PhotoResponse;
import com.rapidupload.backend.dto.PropertyResponse;
import com.rapidupload.backend.exceptions.PropertyNotFoundException;
import com.rapidupload.backend.models.PagedResponse;
import com.rapidupload.backend.models.Photo;
import com.rapidupload.backend.models.Property;
import com.rapidupload.backend.repositories.PhotoRepository;
import com.rapidupload.backend.repositories.PropertyRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PhotoRepository photoRepository;

    public PropertyService(PropertyRepository propertyRepository, PhotoRepository photoRepository) {
        this.propertyRepository = propertyRepository;
        this.photoRepository = photoRepository;
    }

    public PropertyResponse createProperty(CreatePropertyRequest request) {
        Property property = propertyRepository.createProperty(request.getName());
        return toPropertyResponse(property);
    }

    public PropertyResponse getProperty(String propertyId) {
        Property property = propertyRepository.getProperty(propertyId);
        return toPropertyResponse(property);
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
     * Recalculates and updates the PhotoCount for a property by counting photos with status='uploaded'
     * This is called after batch uploads complete to ensure accurate count without transaction conflicts
     */
    public PropertyResponse recalculatePhotoCount(String propertyId) {
        // Verify property exists
        Property property = propertyRepository.getProperty(propertyId);
        
        // Count photos with status='uploaded' for this property
        // We'll use pagination to count all photos
        int totalCount = 0;
        Map<String, String> lastKey = null;
        
        do {
            PagedResponse<Photo> page = photoRepository.listPhotosByProperty(propertyId, 100, lastKey);
            // Count only uploaded photos
            long uploadedCount = page.getItems().stream()
                    .filter(photo -> "uploaded".equals(photo.getStatus()))
                    .count();
            totalCount += (int) uploadedCount;
            lastKey = page.getLastEvaluatedKey();
        } while (lastKey != null && !lastKey.isEmpty());
        
        // Update property with new count
        property.setPhotoCount(totalCount);
        propertyRepository.updateProperty(property);
        
        return toPropertyResponse(property);
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


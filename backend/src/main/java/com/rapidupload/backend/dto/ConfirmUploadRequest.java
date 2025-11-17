package com.rapidupload.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public class ConfirmUploadRequest {
    @NotNull(message = "Photo ID is required")
    @Pattern(regexp = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", 
             flags = Pattern.Flag.CASE_INSENSITIVE, message = "Photo ID must be a valid UUID")
    private String photoId;

    @NotNull(message = "Property ID is required")
    private String propertyId;

    @NotNull(message = "S3 key is required")
    @Pattern(regexp = "^properties/[^/]+/[^/]+-.*", message = "S3 key must match pattern: properties/{propertyId}/{photoId}-*")
    private String s3Key;

    public ConfirmUploadRequest() {
    }

    public String getPhotoId() {
        return photoId;
    }

    public void setPhotoId(String photoId) {
        this.photoId = photoId;
    }

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getS3Key() {
        return s3Key;
    }

    public void setS3Key(String s3Key) {
        this.s3Key = s3Key;
    }
}


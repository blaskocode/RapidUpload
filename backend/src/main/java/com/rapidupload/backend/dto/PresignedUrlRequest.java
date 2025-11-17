package com.rapidupload.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class PresignedUrlRequest {
    @NotNull(message = "Property ID is required")
    private String propertyId;

    @NotNull(message = "Filename is required")
    @Size(max = 255, message = "Filename must not exceed 255 characters")
    private String filename;

    @NotNull(message = "Content type is required")
    @Pattern(regexp = "image/(jpeg|jpg|png|heic|heif|webp)", flags = Pattern.Flag.CASE_INSENSITIVE, 
             message = "Content type must be image/jpeg, image/png, image/heic, image/heif, or image/webp")
    private String contentType;

    @NotNull(message = "File size is required")
    @Positive(message = "File size must be positive")
    private Long fileSize;

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    public PresignedUrlRequest() {
    }

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public void validateFileSize() {
        if (fileSize != null && fileSize > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size must not exceed 50MB");
        }
    }
}


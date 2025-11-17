package com.rapidupload.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.Instant;

public class PhotoResponse {
    private String photoId;
    private String propertyId;
    private String filename;
    private String s3Key;
    private String s3Bucket;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private String uploadedAt;
    
    private Long fileSize;
    private String status;
    private String contentType;

    public PhotoResponse() {
    }

    public PhotoResponse(String photoId, String propertyId, String filename, String s3Key, 
                        String s3Bucket, String uploadedAt, Long fileSize, String status, String contentType) {
        this.photoId = photoId;
        this.propertyId = propertyId;
        this.filename = filename;
        this.s3Key = s3Key;
        this.s3Bucket = s3Bucket;
        this.uploadedAt = uploadedAt;
        this.fileSize = fileSize;
        this.status = status;
        this.contentType = contentType;
    }

    // Getters and setters
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

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getS3Key() {
        return s3Key;
    }

    public void setS3Key(String s3Key) {
        this.s3Key = s3Key;
    }

    public String getS3Bucket() {
        return s3Bucket;
    }

    public void setS3Bucket(String s3Bucket) {
        this.s3Bucket = s3Bucket;
    }

    public String getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(String uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public Long getFileSize() {
        return fileSize;
    }

    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }
}


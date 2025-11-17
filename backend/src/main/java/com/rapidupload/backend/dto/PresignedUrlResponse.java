package com.rapidupload.backend.dto;

import java.util.Map;

public class PresignedUrlResponse {
    private String photoId;
    private String uploadUrl;
    private Integer expiresIn;
    private Map<String, String> fields;

    public PresignedUrlResponse() {
    }

    public PresignedUrlResponse(String photoId, String uploadUrl, Integer expiresIn, Map<String, String> fields) {
        this.photoId = photoId;
        this.uploadUrl = uploadUrl;
        this.expiresIn = expiresIn;
        this.fields = fields;
    }

    public String getPhotoId() {
        return photoId;
    }

    public void setPhotoId(String photoId) {
        this.photoId = photoId;
    }

    public String getUploadUrl() {
        return uploadUrl;
    }

    public void setUploadUrl(String uploadUrl) {
        this.uploadUrl = uploadUrl;
    }

    public Integer getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(Integer expiresIn) {
        this.expiresIn = expiresIn;
    }

    public Map<String, String> getFields() {
        return fields;
    }

    public void setFields(Map<String, String> fields) {
        this.fields = fields;
    }
}


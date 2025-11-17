package com.rapidupload.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.Instant;

public class PropertyResponse {
    private String propertyId;
    private String name;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", timezone = "UTC")
    private String createdAt;
    
    private Integer photoCount;

    public PropertyResponse() {
    }

    public PropertyResponse(String propertyId, String name, String createdAt, Integer photoCount) {
        this.propertyId = propertyId;
        this.name = name;
        this.createdAt = createdAt;
        this.photoCount = photoCount;
    }

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getPhotoCount() {
        return photoCount;
    }

    public void setPhotoCount(Integer photoCount) {
        this.photoCount = photoCount;
    }
}


package com.rapidupload.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public class TriggerAnalysisRequest {
    @NotBlank(message = "Property ID is required")
    private String propertyId;

    @NotEmpty(message = "Photo IDs list cannot be empty")
    @Size(max = 100, message = "Cannot analyze more than 100 photos at once")
    private List<String> photoIds;

    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String propertyId) { this.propertyId = propertyId; }

    public List<String> getPhotoIds() { return photoIds; }
    public void setPhotoIds(List<String> photoIds) { this.photoIds = photoIds; }
}

package com.rapidupload.backend.dto;

import com.rapidupload.backend.models.Detection;
import java.util.List;

public class AnalysisResponse {
    private String analysisId;
    private String photoId;
    private String propertyId;
    private String status;
    private String createdAt;
    private String completedAt;
    private List<Detection> detections;
    private String claudeAnalysis;
    private String errorMessage;
    private boolean lowConfidence; // true if any detection < 60%

    public String getAnalysisId() { return analysisId; }
    public void setAnalysisId(String analysisId) { this.analysisId = analysisId; }

    public String getPhotoId() { return photoId; }
    public void setPhotoId(String photoId) { this.photoId = photoId; }

    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String propertyId) { this.propertyId = propertyId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getCompletedAt() { return completedAt; }
    public void setCompletedAt(String completedAt) { this.completedAt = completedAt; }

    public List<Detection> getDetections() { return detections; }
    public void setDetections(List<Detection> detections) { this.detections = detections; }

    public String getClaudeAnalysis() { return claudeAnalysis; }
    public void setClaudeAnalysis(String claudeAnalysis) { this.claudeAnalysis = claudeAnalysis; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public boolean isLowConfidence() { return lowConfidence; }
    public void setLowConfidence(boolean lowConfidence) { this.lowConfidence = lowConfidence; }
}

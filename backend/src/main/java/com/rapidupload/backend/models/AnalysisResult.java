package com.rapidupload.backend.models;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;
import java.util.List;

@DynamoDbBean
public class AnalysisResult {
    private String analysisId;
    private String photoId;
    private String propertyId;
    private String status; // 'pending' | 'processing' | 'completed' | 'failed'
    private String createdAt;
    private String completedAt;
    private List<Detection> detections;
    private String claudeAnalysis; // JSON string of Claude's response
    private String errorMessage;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("AnalysisID")
    public String getAnalysisId() { return analysisId; }
    public void setAnalysisId(String analysisId) { this.analysisId = analysisId; }

    @DynamoDbSecondaryPartitionKey(indexNames = "PhotoID-index")
    @DynamoDbAttribute("PhotoID")
    public String getPhotoId() { return photoId; }
    public void setPhotoId(String photoId) { this.photoId = photoId; }

    @DynamoDbSecondaryPartitionKey(indexNames = "PropertyID-index")
    @DynamoDbAttribute("PropertyID")
    public String getPropertyId() { return propertyId; }
    public void setPropertyId(String propertyId) { this.propertyId = propertyId; }

    @DynamoDbAttribute("Status")
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
}

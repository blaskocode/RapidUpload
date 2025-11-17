package com.rapidupload.backend.dto;

import java.util.List;

public class BatchPresignedUrlResponse {
    private List<PresignedUrlResponse> urls;
    private int totalRequested;
    private int totalGenerated;

    public BatchPresignedUrlResponse() {
    }

    public BatchPresignedUrlResponse(List<PresignedUrlResponse> urls, int totalRequested, int totalGenerated) {
        this.urls = urls;
        this.totalRequested = totalRequested;
        this.totalGenerated = totalGenerated;
    }

    public List<PresignedUrlResponse> getUrls() {
        return urls;
    }

    public void setUrls(List<PresignedUrlResponse> urls) {
        this.urls = urls;
    }

    public int getTotalRequested() {
        return totalRequested;
    }

    public void setTotalRequested(int totalRequested) {
        this.totalRequested = totalRequested;
    }

    public int getTotalGenerated() {
        return totalGenerated;
    }

    public void setTotalGenerated(int totalGenerated) {
        this.totalGenerated = totalGenerated;
    }
}


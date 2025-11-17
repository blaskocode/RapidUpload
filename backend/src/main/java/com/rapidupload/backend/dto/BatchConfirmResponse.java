package com.rapidupload.backend.dto;

import java.util.ArrayList;
import java.util.List;

public class BatchConfirmResponse {
    private int totalRequested;
    private int totalConfirmed;
    private int totalFailed;
    private List<ConfirmUploadResponse> successful;
    private List<FailedConfirmation> failed;

    public BatchConfirmResponse() {
        this.successful = new ArrayList<>();
        this.failed = new ArrayList<>();
    }

    public int getTotalRequested() {
        return totalRequested;
    }

    public void setTotalRequested(int totalRequested) {
        this.totalRequested = totalRequested;
    }

    public int getTotalConfirmed() {
        return totalConfirmed;
    }

    public void setTotalConfirmed(int totalConfirmed) {
        this.totalConfirmed = totalConfirmed;
    }

    public int getTotalFailed() {
        return totalFailed;
    }

    public void setTotalFailed(int totalFailed) {
        this.totalFailed = totalFailed;
    }

    public List<ConfirmUploadResponse> getSuccessful() {
        return successful;
    }

    public void setSuccessful(List<ConfirmUploadResponse> successful) {
        this.successful = successful;
    }

    public List<FailedConfirmation> getFailed() {
        return failed;
    }

    public void setFailed(List<FailedConfirmation> failed) {
        this.failed = failed;
    }

    public static class FailedConfirmation {
        private String photoId;
        private String reason;

        public FailedConfirmation(String photoId, String reason) {
            this.photoId = photoId;
            this.reason = reason;
        }

        public String getPhotoId() {
            return photoId;
        }

        public void setPhotoId(String photoId) {
            this.photoId = photoId;
        }

        public String getReason() {
            return reason;
        }

        public void setReason(String reason) {
            this.reason = reason;
        }
    }
}


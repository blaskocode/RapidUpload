package com.rapidupload.backend.dto;

public class ConfirmUploadResponse {
    private String photoId;
    private String photoUrl;
    private String status;

    public ConfirmUploadResponse() {
    }

    public ConfirmUploadResponse(String photoId, String photoUrl, String status) {
        this.photoId = photoId;
        this.photoUrl = photoUrl;
        this.status = status;
    }

    public String getPhotoId() {
        return photoId;
    }

    public void setPhotoId(String photoId) {
        this.photoId = photoId;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}


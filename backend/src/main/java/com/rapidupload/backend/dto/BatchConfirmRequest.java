package com.rapidupload.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public class BatchConfirmRequest {

    @NotEmpty(message = "Confirmations list cannot be empty")
    @Size(max = 500, message = "Cannot confirm more than 500 uploads at once")
    @Valid
    private List<ConfirmUploadRequest> confirmations;

    public List<ConfirmUploadRequest> getConfirmations() {
        return confirmations;
    }

    public void setConfirmations(List<ConfirmUploadRequest> confirmations) {
        this.confirmations = confirmations;
    }
}


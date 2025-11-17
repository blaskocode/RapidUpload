package com.rapidupload.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreatePropertyRequest {
    @NotBlank(message = "Property name is required")
    @Size(max = 200, message = "Property name must not exceed 200 characters")
    private String name;

    public CreatePropertyRequest() {
    }

    public CreatePropertyRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}


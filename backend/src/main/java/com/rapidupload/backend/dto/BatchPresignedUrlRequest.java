package com.rapidupload.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class BatchPresignedUrlRequest {

    @NotBlank(message = "Property ID is required")
    private String propertyId;

    @NotEmpty(message = "Files list cannot be empty")
    @Size(max = 1000, message = "Cannot request more than 1000 presigned URLs at once")
    @Valid
    private List<FileMetadata> files;

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public List<FileMetadata> getFiles() {
        return files;
    }

    public void setFiles(List<FileMetadata> files) {
        this.files = files;
    }

    public static class FileMetadata {
        @NotBlank(message = "Filename is required")
        private String filename;

        @NotBlank(message = "Content type is required")
        private String contentType;

        @NotNull(message = "File size is required")
        private Long fileSize;

        public String getFilename() {
            return filename;
        }

        public void setFilename(String filename) {
            this.filename = filename;
        }

        public String getContentType() {
            return contentType;
        }

        public void setContentType(String contentType) {
            this.contentType = contentType;
        }

        public Long getFileSize() {
            return fileSize;
        }

        public void setFileSize(Long fileSize) {
            this.fileSize = fileSize;
        }

        public void validateFileSize() {
            if (fileSize == null || fileSize <= 0) {
                throw new IllegalArgumentException("File size must be greater than 0");
            }
            // Max 100MB
            if (fileSize > 100 * 1024 * 1024) {
                throw new IllegalArgumentException("File size cannot exceed 100MB");
            }
        }
    }
}


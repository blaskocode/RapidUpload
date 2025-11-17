package com.rapidupload.backend.exceptions;

public class PresignedUrlExpiredException extends RuntimeException {
    public PresignedUrlExpiredException(String message) {
        super(message);
    }

    public PresignedUrlExpiredException(String message, Throwable cause) {
        super(message, cause);
    }
}


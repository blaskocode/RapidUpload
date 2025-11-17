package com.rapidupload.backend.exceptions;

public class InvalidS3KeyException extends RuntimeException {
    public InvalidS3KeyException(String message) {
        super(message);
    }

    public InvalidS3KeyException(String message, Throwable cause) {
        super(message, cause);
    }
}


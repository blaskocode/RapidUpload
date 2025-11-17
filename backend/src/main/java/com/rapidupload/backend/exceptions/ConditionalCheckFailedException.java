package com.rapidupload.backend.exceptions;

public class ConditionalCheckFailedException extends RuntimeException {
    public ConditionalCheckFailedException(String message) {
        super(message);
    }

    public ConditionalCheckFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}


package com.rapidupload.backend.exceptions;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(PropertyNotFoundException.class)
    public ResponseEntity<Map<String, String>> handlePropertyNotFound(PropertyNotFoundException e) {
        logger.error("Property not found: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Property not found");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(PhotoNotFoundException.class)
    public ResponseEntity<Map<String, String>> handlePhotoNotFound(PhotoNotFoundException e) {
        logger.error("Photo not found: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Photo not found");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(ConditionalCheckFailedException.class)
    public ResponseEntity<Map<String, String>> handleConditionalCheckFailed(ConditionalCheckFailedException e) {
        logger.error("Conditional check failed: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Conditional check failed");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(com.rapidupload.backend.exceptions.PhotoAlreadyConfirmedException.class)
    public ResponseEntity<Map<String, String>> handlePhotoAlreadyConfirmed(com.rapidupload.backend.exceptions.PhotoAlreadyConfirmedException e) {
        logger.error("Photo already confirmed: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Photo already confirmed");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleResourceNotFound(ResourceNotFoundException e) {
        logger.error("DynamoDB resource not found: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Resource not found");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(ProvisionedThroughputExceededException.class)
    public ResponseEntity<Map<String, String>> handleThroughputExceeded(ProvisionedThroughputExceededException e) {
        logger.error("DynamoDB throughput exceeded: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Service temporarily unavailable");
        error.put("message", "Request rate too high. Please try again later.");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(MethodArgumentNotValidException e) {
        logger.error("Validation error: {}", e.getMessage());
        Map<String, Object> error = new HashMap<>();
        Map<String, String> fieldErrors = new HashMap<>();
        
        e.getBindingResult().getAllErrors().forEach((err) -> {
            String fieldName = ((FieldError) err).getField();
            String errorMessage = err.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });
        
        error.put("error", "Validation failed");
        error.put("fieldErrors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }


    @ExceptionHandler(com.rapidupload.backend.exceptions.PresignedUrlExpiredException.class)
    public ResponseEntity<Map<String, String>> handlePresignedUrlExpired(com.rapidupload.backend.exceptions.PresignedUrlExpiredException e) {
        logger.error("Presigned URL expired: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Presigned URL expired");
        error.put("message", "The upload link has expired. Please request a new one.");
        return ResponseEntity.status(HttpStatus.GONE).body(error);
    }

    @ExceptionHandler(com.rapidupload.backend.exceptions.S3UploadFailedException.class)
    public ResponseEntity<Map<String, String>> handleS3UploadFailed(com.rapidupload.backend.exceptions.S3UploadFailedException e) {
        logger.error("S3 upload failed: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Upload failed");
        error.put("message", "Failed to upload file to storage. Please try again.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(com.rapidupload.backend.exceptions.InvalidS3KeyException.class)
    public ResponseEntity<Map<String, String>> handleInvalidS3Key(com.rapidupload.backend.exceptions.InvalidS3KeyException e) {
        logger.error("Invalid S3 key: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Invalid S3 key");
        error.put("message", "The provided storage key is invalid.");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException e) {
        logger.error("Illegal argument: {}", e.getMessage());
        Map<String, String> error = new HashMap<>();
        error.put("error", "Invalid request");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException e) {
        logger.error("Unexpected error: {}", e.getMessage(), e);
        Map<String, String> error = new HashMap<>();
        error.put("error", "Internal server error");
        error.put("message", "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}


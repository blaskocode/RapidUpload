package com.rapidupload.backend.controllers;

import com.rapidupload.backend.services.CleanupService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class CleanupController {

    private static final Logger logger = LoggerFactory.getLogger(CleanupController.class);
    private final CleanupService cleanupService;

    public CleanupController(CleanupService cleanupService) {
        this.cleanupService = cleanupService;
    }

    /**
     * DELETE /api/admin/cleanup
     * Clears all data: S3 objects, DynamoDB photos, and DynamoDB properties
     * 
     * WARNING: This operation is irreversible!
     */
    @DeleteMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> clearAllData() {
        logger.warn("Cleanup endpoint called - clearing all data");
        
        try {
            CleanupService.CleanupResult result = cleanupService.clearAllData();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", result.success);
            response.put("message", result.message);
            response.put("s3ObjectsDeleted", result.s3ObjectsDeleted);
            response.put("photosDeleted", result.photosDeleted);
            response.put("propertiesDeleted", result.propertiesDeleted);
            
            if (result.success) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
            }
        } catch (Exception e) {
            logger.error("Error in cleanup endpoint", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error during cleanup: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}


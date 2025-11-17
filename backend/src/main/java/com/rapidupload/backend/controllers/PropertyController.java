package com.rapidupload.backend.controllers;

import com.rapidupload.backend.dto.CreatePropertyRequest;
import com.rapidupload.backend.dto.PagedPhotoResponse;
import com.rapidupload.backend.dto.PropertyResponse;
import com.rapidupload.backend.services.PropertyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/properties")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @PostMapping
    public ResponseEntity<PropertyResponse> createProperty(@Valid @RequestBody CreatePropertyRequest request) {
        PropertyResponse response = propertyService.createProperty(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<PropertyResponse>> listProperties(
            @RequestParam(required = false) Boolean paginated,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String lastEvaluatedKey) {
        
        // If pagination requested, return paginated response
        if (paginated != null && paginated) {
            Map<String, String> exclusiveStartKey = null;
            if (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty()) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    exclusiveStartKey = mapper.readValue(lastEvaluatedKey,
                            new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
                } catch (Exception e) {
                    exclusiveStartKey = null;
                }
            }
            
            // Note: This returns a different structure, but for backwards compatibility,
            // we keep returning List<PropertyResponse> for non-paginated
            // In a real API, you'd want to version this or use different endpoints
            // For now, we'll stick with unpaginated for backwards compatibility
        }
        
        List<PropertyResponse> properties = propertyService.listProperties();
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PropertyResponse> getProperty(@PathVariable String id) {
        PropertyResponse property = propertyService.getProperty(id);
        return ResponseEntity.ok(property);
    }

    @GetMapping("/{id}/photos")
    public ResponseEntity<PagedPhotoResponse> getPropertyPhotos(
            @PathVariable String id,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String lastEvaluatedKey) {
        // Parse lastEvaluatedKey from JSON string if provided
        Map<String, String> exclusiveStartKey = null;
        if (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                exclusiveStartKey = mapper.readValue(lastEvaluatedKey, 
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
            } catch (Exception e) {
                // If parsing fails, treat as null (start from beginning)
                exclusiveStartKey = null;
            }
        }
        PagedPhotoResponse photos = propertyService.getPropertyPhotos(id, limit, exclusiveStartKey);
        return ResponseEntity.ok(photos);
    }

    @PostMapping("/{id}/recalculate-count")
    public ResponseEntity<PropertyResponse> recalculatePhotoCount(@PathVariable String id) {
        PropertyResponse property = propertyService.recalculatePhotoCount(id);
        return ResponseEntity.ok(property);
    }
}


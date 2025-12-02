package com.rapidupload.backend.controllers;

import com.rapidupload.backend.dto.*;
import com.rapidupload.backend.models.AnalysisResult;
import com.rapidupload.backend.services.AnalysisService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/analysis")
public class AnalysisController {
    private static final Logger logger = LoggerFactory.getLogger(AnalysisController.class);
    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping("/trigger")
    public ResponseEntity<Map<String, Object>> triggerAnalysis(@Valid @RequestBody TriggerAnalysisRequest request) {
        logger.info("Triggering analysis for {} photos in property {}",
            request.getPhotoIds().size(), request.getPropertyId());

        List<AnalysisResult> results = analysisService.triggerBatchAnalysis(
            request.getPropertyId(), request.getPhotoIds());

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Analysis triggered for " + results.size() + " photos");
        response.put("analysisIds", results.stream().map(AnalysisResult::getAnalysisId).toList());

        return ResponseEntity.accepted().body(response);
    }

    @GetMapping("/photo/{photoId}")
    public ResponseEntity<AnalysisResponse> getAnalysisByPhoto(@PathVariable String photoId) {
        logger.debug("Getting analysis for photo: {}", photoId);
        AnalysisResponse response = analysisService.getAnalysisByPhotoId(photoId);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<PagedAnalysisResponse> getAnalysisByProperty(
            @PathVariable String propertyId,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String lastEvaluatedKey) {
        logger.debug("Getting analysis for property: {}", propertyId);

        Map<String, String> startKey = null;
        if (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty()) {
            startKey = new HashMap<>();
            startKey.put("AnalysisID", lastEvaluatedKey);
        }

        PagedAnalysisResponse response = analysisService.getAnalysisByPropertyId(propertyId, limit, startKey);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{analysisId}")
    public ResponseEntity<AnalysisResponse> getAnalysis(@PathVariable String analysisId) {
        logger.debug("Getting analysis: {}", analysisId);
        AnalysisResponse response = analysisService.getAnalysis(analysisId);
        if (response == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{analysisId}/detection/{detectionIndex}/volume")
    public ResponseEntity<?> updateDetectionVolume(
            @PathVariable String analysisId,
            @PathVariable int detectionIndex,
            @RequestBody Map<String, Double> body
    ) {
        logger.info("Updating volume for analysis {} detection {}", analysisId, detectionIndex);

        Double userVolume = body.get("userVolumeOverride");
        if (userVolume == null || userVolume < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid volume value"));
        }

        try {
            analysisService.updateDetectionVolume(analysisId, detectionIndex, userVolume);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "detectionIndex", detectionIndex,
                "userVolumeOverride", userVolume
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Failed to update volume: {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to update volume"));
        }
    }
}

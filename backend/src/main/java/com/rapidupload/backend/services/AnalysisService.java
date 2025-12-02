package com.rapidupload.backend.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rapidupload.backend.dto.AnalysisResponse;
import com.rapidupload.backend.dto.PagedAnalysisResponse;
import com.rapidupload.backend.models.AnalysisResult;
import com.rapidupload.backend.models.PagedResponse;
import com.rapidupload.backend.models.Photo;
import com.rapidupload.backend.repositories.AnalysisRepository;
import com.rapidupload.backend.repositories.PhotoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;
import software.amazon.awssdk.services.lambda.model.InvocationType;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalysisService {
    private static final Logger logger = LoggerFactory.getLogger(AnalysisService.class);

    private final AnalysisRepository analysisRepository;
    private final PhotoRepository photoRepository;
    private final LambdaClient lambdaClient;
    private final ObjectMapper objectMapper;
    private final String lambdaFunctionName;

    public AnalysisService(
            AnalysisRepository analysisRepository,
            PhotoRepository photoRepository,
            LambdaClient lambdaClient,
            @Value("${aws.analysis.lambda-function-name}") String lambdaFunctionName) {
        this.analysisRepository = analysisRepository;
        this.photoRepository = photoRepository;
        this.lambdaClient = lambdaClient;
        this.lambdaFunctionName = lambdaFunctionName;
        this.objectMapper = new ObjectMapper();
    }

    public List<AnalysisResult> triggerBatchAnalysis(String propertyId, List<String> photoIds) {
        logger.info("Triggering batch analysis for {} photos", photoIds.size());

        List<AnalysisResult> results = new ArrayList<>();

        for (String photoId : photoIds) {
            try {
                // Get photo details
                Photo photo = photoRepository.getPhoto(photoId);

                // Check if analysis already exists
                AnalysisResult existing = analysisRepository.getAnalysisByPhotoId(photoId);
                if (existing != null && !"failed".equals(existing.getStatus())) {
                    logger.info("Analysis already exists for photo {}: {}", photoId, existing.getAnalysisId());
                    results.add(existing);
                    continue;
                }

                // Create analysis record
                AnalysisResult analysis = analysisRepository.createAnalysis(photoId, propertyId);
                results.add(analysis);

                // Invoke Lambda asynchronously
                invokeLambdaAsync(analysis.getAnalysisId(), photoId, propertyId,
                    photo.getS3Bucket(), photo.getS3Key());

            } catch (Exception e) {
                logger.error("Failed to trigger analysis for photo {}: {}", photoId, e.getMessage());
            }
        }

        return results;
    }

    private void invokeLambdaAsync(String analysisId, String photoId, String propertyId,
                                    String s3Bucket, String s3Key) {
        try {
            Map<String, String> payload = new HashMap<>();
            payload.put("analysisId", analysisId);
            payload.put("photoId", photoId);
            payload.put("propertyId", propertyId);
            payload.put("s3Bucket", s3Bucket);
            payload.put("s3Key", s3Key);

            String payloadJson = objectMapper.writeValueAsString(payload);

            InvokeRequest request = InvokeRequest.builder()
                    .functionName(lambdaFunctionName)
                    .invocationType(InvocationType.EVENT) // Async invocation
                    .payload(SdkBytes.fromUtf8String(payloadJson))
                    .build();

            lambdaClient.invoke(request);
            logger.info("Invoked Lambda for analysis {}", analysisId);

        } catch (Exception e) {
            logger.error("Failed to invoke Lambda for analysis {}: {}", analysisId, e.getMessage());
            throw new RuntimeException("Failed to invoke analysis Lambda", e);
        }
    }

    public AnalysisResponse getAnalysis(String analysisId) {
        AnalysisResult result = analysisRepository.getAnalysis(analysisId);
        return result != null ? toAnalysisResponse(result) : null;
    }

    public AnalysisResponse getAnalysisByPhotoId(String photoId) {
        AnalysisResult result = analysisRepository.getAnalysisByPhotoId(photoId);
        return result != null ? toAnalysisResponse(result) : null;
    }

    public PagedAnalysisResponse getAnalysisByPropertyId(String propertyId, Integer limit, Map<String, String> exclusiveStartKey) {
        PagedResponse<AnalysisResult> pagedResults = analysisRepository.listAnalysisByProperty(
            propertyId, limit, exclusiveStartKey);

        List<AnalysisResponse> responses = pagedResults.getItems().stream()
                .map(this::toAnalysisResponse)
                .collect(Collectors.toList());

        return new PagedAnalysisResponse(
            responses,
            pagedResults.getLastEvaluatedKey(),
            pagedResults.isHasMore()
        );
    }

    public void updateDetectionVolume(String analysisId, int detectionIndex, Double userVolumeOverride) {
        AnalysisResult analysis = analysisRepository.getAnalysis(analysisId);
        if (analysis == null) {
            throw new IllegalArgumentException("Analysis not found: " + analysisId);
        }

        var detections = analysis.getDetections();
        if (detections == null || detectionIndex < 0 || detectionIndex >= detections.size()) {
            throw new IllegalArgumentException("Invalid detection index: " + detectionIndex);
        }

        var detection = detections.get(detectionIndex);
        detection.setUserVolumeOverride(userVolumeOverride);

        analysisRepository.updateAnalysis(analysis);
        logger.info("Updated volume for analysis {} detection {} to {}", analysisId, detectionIndex, userVolumeOverride);
    }

    private AnalysisResponse toAnalysisResponse(AnalysisResult result) {
        AnalysisResponse response = new AnalysisResponse();
        response.setAnalysisId(result.getAnalysisId());
        response.setPhotoId(result.getPhotoId());
        response.setPropertyId(result.getPropertyId());
        response.setStatus(result.getStatus());
        response.setCreatedAt(result.getCreatedAt());
        response.setCompletedAt(result.getCompletedAt());
        response.setDetections(result.getDetections());
        response.setClaudeAnalysis(result.getClaudeAnalysis());
        response.setErrorMessage(result.getErrorMessage());

        // Low confidence checking removed - Gemini doesn't provide confidence scores
        response.setLowConfidence(false);

        return response;
    }
}

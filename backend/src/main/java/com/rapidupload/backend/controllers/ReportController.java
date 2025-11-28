package com.rapidupload.backend.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rapidupload.backend.models.Property;
import com.rapidupload.backend.repositories.PropertyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;
import software.amazon.awssdk.services.lambda.model.InvokeResponse;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;

import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private static final Logger logger = LoggerFactory.getLogger(ReportController.class);

    private final LambdaClient lambdaClient;
    private final S3Presigner s3Presigner;
    private final PropertyRepository propertyRepository;
    private final ObjectMapper objectMapper;
    private final String reportLambdaName;
    private final String bucketName;

    public ReportController(
            LambdaClient lambdaClient,
            S3Presigner s3Presigner,
            PropertyRepository propertyRepository,
            @Value("${aws.analysis.report-lambda-name:rapidupload-report-generator}") String reportLambdaName,
            @Value("${aws.s3.bucket-name}") String bucketName) {
        this.lambdaClient = lambdaClient;
        this.s3Presigner = s3Presigner;
        this.propertyRepository = propertyRepository;
        this.reportLambdaName = reportLambdaName;
        this.bucketName = bucketName;
        this.objectMapper = new ObjectMapper();
    }

    @PostMapping("/generate/{propertyId}")
    public ResponseEntity<Map<String, Object>> generateReport(
            @PathVariable String propertyId,
            @RequestBody(required = false) List<String> photoIds) {

        logger.info("Generating report for property: {}", propertyId);

        try {
            Property property = propertyRepository.getProperty(propertyId);

            Map<String, Object> payload = new HashMap<>();
            payload.put("propertyId", propertyId);
            payload.put("propertyName", property.getName());
            if (photoIds != null && !photoIds.isEmpty()) {
                payload.put("photoIds", photoIds);
            }

            String payloadJson = objectMapper.writeValueAsString(payload);

            InvokeRequest request = InvokeRequest.builder()
                    .functionName(reportLambdaName)
                    .payload(SdkBytes.fromUtf8String(payloadJson))
                    .build();

            InvokeResponse response = lambdaClient.invoke(request);
            String responseBody = response.payload().asUtf8String();

            @SuppressWarnings("unchecked")
            Map<String, Object> lambdaResponse = objectMapper.readValue(responseBody, Map.class);

            if (response.statusCode() == 200) {
                @SuppressWarnings("unchecked")
                Map<String, Object> body = objectMapper.readValue(
                    (String) lambdaResponse.get("body"), Map.class);

                String reportKey = (String) body.get("reportKey");

                // Generate presigned URL for download
                GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofHours(1))
                        .getObjectRequest(GetObjectRequest.builder()
                                .bucket(bucketName)
                                .key(reportKey)
                                .build())
                        .build();

                String downloadUrl = s3Presigner.presignGetObject(presignRequest).url().toString();

                Map<String, Object> result = new HashMap<>();
                result.put("reportKey", reportKey);
                result.put("downloadUrl", downloadUrl);
                result.put("photosIncluded", body.get("photosIncluded"));

                return ResponseEntity.ok(result);
            } else {
                throw new RuntimeException("Report generation failed");
            }

        } catch (Exception e) {
            logger.error("Failed to generate report: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to generate report");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}

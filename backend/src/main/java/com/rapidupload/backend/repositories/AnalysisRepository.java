package com.rapidupload.backend.repositories;

import com.rapidupload.backend.models.AnalysisResult;
import com.rapidupload.backend.models.PagedResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.*;
import software.amazon.awssdk.services.dynamodb.model.*;
import java.time.Instant;
import java.util.*;

@Repository
public class AnalysisRepository {
    private static final Logger logger = LoggerFactory.getLogger(AnalysisRepository.class);

    private final DynamoDbEnhancedClient enhancedClient;
    private final DynamoDbTable<AnalysisResult> analysisTable;

    public AnalysisRepository(DynamoDbEnhancedClient enhancedClient,
                              @Value("${aws.dynamodb.tables.analysis:Analysis}") String tableName) {
        this.enhancedClient = enhancedClient;
        this.analysisTable = enhancedClient.table(tableName, TableSchema.fromBean(AnalysisResult.class));
    }

    public AnalysisResult createAnalysis(String photoId, String propertyId) {
        AnalysisResult analysis = new AnalysisResult();
        analysis.setAnalysisId(UUID.randomUUID().toString());
        analysis.setPhotoId(photoId);
        analysis.setPropertyId(propertyId);
        analysis.setStatus("pending");
        analysis.setCreatedAt(Instant.now().toString());

        analysisTable.putItem(analysis);
        logger.info("Created analysis: {} for photo: {}", analysis.getAnalysisId(), photoId);
        return analysis;
    }

    public AnalysisResult getAnalysis(String analysisId) {
        Key key = Key.builder().partitionValue(analysisId).build();
        return analysisTable.getItem(key);
    }

    public AnalysisResult getAnalysisByPhotoId(String photoId) {
        DynamoDbIndex<AnalysisResult> index = analysisTable.index("PhotoID-index");
        QueryEnhancedRequest request = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(Key.builder().partitionValue(photoId).build()))
                .limit(1)
                .build();

        var results = index.query(request);
        var iterator = results.iterator();
        if (iterator.hasNext()) {
            var page = iterator.next();
            if (!page.items().isEmpty()) {
                return page.items().get(0);
            }
        }
        return null;
    }

    public void updateAnalysis(AnalysisResult analysis) {
        analysisTable.updateItem(analysis);
        logger.info("Updated analysis: {}", analysis.getAnalysisId());
    }

    public PagedResponse<AnalysisResult> listAnalysisByProperty(String propertyId, Integer limit, Map<String, String> exclusiveStartKey) {
        int pageSize = limit != null ? Math.min(Math.max(limit, 1), 100) : 50;

        DynamoDbIndex<AnalysisResult> index = analysisTable.index("PropertyID-index");
        QueryEnhancedRequest.Builder queryBuilder = QueryEnhancedRequest.builder()
                .queryConditional(QueryConditional.keyEqualTo(Key.builder().partitionValue(propertyId).build()))
                .limit(pageSize);

        if (exclusiveStartKey != null && !exclusiveStartKey.isEmpty() && exclusiveStartKey.containsKey("AnalysisID")) {
            Map<String, AttributeValue> startKeyMap = new HashMap<>();
            startKeyMap.put("PropertyID", AttributeValue.builder().s(propertyId).build());
            startKeyMap.put("AnalysisID", AttributeValue.builder().s(exclusiveStartKey.get("AnalysisID")).build());
            queryBuilder.exclusiveStartKey(startKeyMap);
        }

        var result = index.query(queryBuilder.build());
        List<AnalysisResult> items = new ArrayList<>();
        var pageIterator = result.iterator();

        if (pageIterator.hasNext()) {
            var page = pageIterator.next();
            page.items().forEach(items::add);

            boolean hasMore = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty();
            Map<String, String> lastKey = null;
            if (hasMore && page.lastEvaluatedKey() != null) {
                lastKey = new HashMap<>();
                AttributeValue analysisIdAttr = page.lastEvaluatedKey().get("AnalysisID");
                if (analysisIdAttr != null && analysisIdAttr.s() != null) {
                    lastKey.put("AnalysisID", analysisIdAttr.s());
                }
            }
            return new PagedResponse<>(items, lastKey, hasMore);
        }

        return new PagedResponse<>(items, null, false);
    }
}

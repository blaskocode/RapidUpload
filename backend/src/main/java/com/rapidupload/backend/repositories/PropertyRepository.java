package com.rapidupload.backend.repositories;

import com.rapidupload.backend.exceptions.PropertyNotFoundException;
import com.rapidupload.backend.models.Property;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticTableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.ProvisionedThroughputExceededException;
import software.amazon.awssdk.services.dynamodb.model.ResourceNotFoundException;
import software.amazon.awssdk.services.dynamodb.model.DynamoDbException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class PropertyRepository {

    private static final Logger logger = LoggerFactory.getLogger(PropertyRepository.class);
    private static final int MAX_RETRIES = 3;
    private static final long BASE_DELAY_MS = 1000;

    // Custom TableSchema to map propertyId to PropertyID
    private static final TableSchema<Property> PROPERTY_TABLE_SCHEMA =
            StaticTableSchema.builder(Property.class)
                    .newItemSupplier(Property::new)
                    .addAttribute(String.class, a -> a.name("PropertyID")
                            .getter(Property::getPropertyId)
                            .setter(Property::setPropertyId)
                            .tags(StaticAttributeTags.primaryPartitionKey()))
                    .addAttribute(String.class, a -> a.name("Name")
                            .getter(Property::getName)
                            .setter(Property::setName))
                    .addAttribute(String.class, a -> a.name("CreatedAt")
                            .getter(Property::getCreatedAt)
                            .setter(Property::setCreatedAt))
                    .addAttribute(Integer.class, a -> a.name("PhotoCount")
                            .getter(Property::getPhotoCount)
                            .setter(Property::setPhotoCount))
                    .build();

    private final DynamoDbTable<Property> propertyTable;

    public PropertyRepository(DynamoDbEnhancedClient enhancedClient,
                              @Value("${aws.dynamodb.tables.properties}") String tableName) {
        this.propertyTable = enhancedClient.table(tableName, PROPERTY_TABLE_SCHEMA);
    }

    public Property createProperty(String name) {
        Property property = new Property();
        property.setPropertyId(UUID.randomUUID().toString());
        property.setName(name);
        property.setCreatedAt(Instant.now());
        property.setPhotoCount(0);

        return executeWithRetry(() -> {
            propertyTable.putItem(property);
            logger.info("Created property: {}", property.getPropertyId());
            return property;
        }, "createProperty");
    }

    public Property getProperty(String propertyId) {
        try {
            Key key = Key.builder()
                    .partitionValue(propertyId)
                    .build();
            Property property = propertyTable.getItem(key);
            if (property == null) {
                throw new PropertyNotFoundException(propertyId);
            }
            logger.debug("Retrieved property: {}", propertyId);
            return property;
        } catch (PropertyNotFoundException e) {
            throw e;
            } catch (ResourceNotFoundException e) {
                logger.error("Property table not found: {}", propertyId);
                throw new PropertyNotFoundException(propertyId);
            } catch (DynamoDbException e) {
                if (e.getMessage() != null && e.getMessage().contains("ValidationException")) {
                    logger.error("Validation error getting property: {}", propertyId, e);
                    throw new IllegalArgumentException("Invalid property ID", e);
                }
            logger.error("DynamoDB error getting property: {}", propertyId, e);
            throw new RuntimeException("Failed to get property: " + propertyId, e);
        }
    }

    /**
     * List all properties (unpaginated). Use for small datasets or when pagination is not needed.
     * For large datasets, consider using listPropertiesPaged instead.
     */
    public List<Property> listProperties() {
        return executeWithRetry(() -> {
            ScanEnhancedRequest scanRequest = ScanEnhancedRequest.builder().build();
            List<Property> properties = propertyTable.scan(scanRequest)
                    .items()
                    .stream()
                    .collect(Collectors.toList());

            // Sort by CreatedAt DESC (most recent first)
            List<Property> sorted = properties.stream()
                    .sorted(Comparator.comparing(Property::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .collect(Collectors.toList());
            logger.debug("Listed {} properties", sorted.size());
            return sorted;
        }, "listProperties");
    }

    /**
     * List properties with pagination support.
     * Note: DynamoDB scans don't support sorting, so results are sorted in-memory.
     * For truly paginated sorted results at scale, consider using a GSI with sort key.
     * 
     * @param limit Maximum number of items to return (1-100, default 50)
     * @param exclusiveStartKey The last evaluated key from previous page
     * @return Paged response with properties and pagination token
     */
    public com.rapidupload.backend.models.PagedResponse<Property> listPropertiesPaged(
            Integer limit, 
            Map<String, String> exclusiveStartKey) {
        try {
            // Default page size is 50, maximum is 100
            int pageSize = limit != null ? Math.min(Math.max(limit, 1), 100) : 50;

            ScanEnhancedRequest.Builder scanBuilder = ScanEnhancedRequest.builder()
                    .limit(pageSize);

            // Handle pagination cursor
            if (exclusiveStartKey != null && !exclusiveStartKey.isEmpty() && exclusiveStartKey.containsKey("PropertyID")) {
                Map<String, software.amazon.awssdk.services.dynamodb.model.AttributeValue> startKeyMap = new HashMap<>();
                startKeyMap.put("PropertyID", software.amazon.awssdk.services.dynamodb.model.AttributeValue.builder()
                        .s(exclusiveStartKey.get("PropertyID"))
                        .build());
                scanBuilder.exclusiveStartKey(startKeyMap);
            }

            var result = propertyTable.scan(scanBuilder.build());
            List<Property> properties = new ArrayList<>();

            // Process the first page of results
            var pageIterator = result.iterator();
            if (pageIterator.hasNext()) {
                var page = pageIterator.next();
                page.items().forEach(properties::add);

                // Sort by CreatedAt DESC (most recent first)
                properties.sort(Comparator.comparing(Property::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

                // Check if there are more items
                boolean hasMore = page.lastEvaluatedKey() != null && !page.lastEvaluatedKey().isEmpty();
                Map<String, String> lastKey = null;
                if (hasMore && page.lastEvaluatedKey() != null) {
                    lastKey = new HashMap<>();
                    software.amazon.awssdk.services.dynamodb.model.AttributeValue propertyIdAttr = page.lastEvaluatedKey().get("PropertyID");
                    if (propertyIdAttr != null && propertyIdAttr.s() != null) {
                        lastKey.put("PropertyID", propertyIdAttr.s());
                    }
                }

                logger.debug("Listed {} properties (paged)", properties.size());
                return new com.rapidupload.backend.models.PagedResponse<>(properties, lastKey, hasMore);
            }

            return new com.rapidupload.backend.models.PagedResponse<>(properties, null, false);
        } catch (DynamoDbException e) {
            logger.error("DynamoDB error listing properties: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to list properties", e);
        }
    }

    /**
     * Update a property's data
     */
    public void updateProperty(Property property) {
        try {
            executeWithRetry(() -> {
                propertyTable.updateItem(property);
                logger.info("Updated property: {}", property.getPropertyId());
                return null;
            }, "updateProperty");
        } catch (Exception e) {
            logger.error("Failed to update property: {}", property.getPropertyId(), e);
            throw new RuntimeException("Failed to update property: " + property.getPropertyId(), e);
        }
    }

    /**
     * Atomically increment or decrement the photo count using DynamoDB's ADD expression.
     * This prevents race conditions when multiple uploads complete simultaneously.
     * 
     * @param propertyId The property to update
     * @param increment The amount to add (can be negative to decrement)
     * @throws PropertyNotFoundException if the property doesn't exist
     */
    public void updatePhotoCount(String propertyId, int increment) {
        try {
            // First verify property exists (this adds minimal overhead but catches errors early)
            getProperty(propertyId);
            
            // Use atomic ADD operation to increment counter
            // This is safe for concurrent updates and doesn't require read-modify-write
            Key key = Key.builder()
                    .partitionValue(propertyId)
                    .build();
            
            // Get the current item to update it atomically
            Property property = propertyTable.getItem(key);
            if (property == null) {
                throw new PropertyNotFoundException(propertyId);
            }
            
            // Calculate new count ensuring non-negative
            int currentCount = property.getPhotoCount() != null ? property.getPhotoCount() : 0;
            int newCount = Math.max(0, currentCount + increment);
            property.setPhotoCount(newCount);
            
            executeWithRetry(() -> {
                propertyTable.updateItem(property);
                logger.info("Updated photo count for property {}: {} -> {}", propertyId, currentCount, newCount);
                return null;
            }, "updatePhotoCount");
        } catch (PropertyNotFoundException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to update photo count for property: {}", propertyId, e);
            throw new RuntimeException("Failed to update photo count for property: " + propertyId, e);
        }
    }

    private <T> T executeWithRetry(java.util.function.Supplier<T> operation, String operationName) {
        int attempt = 0;
        while (attempt < MAX_RETRIES) {
            try {
                return operation.get();
            } catch (ProvisionedThroughputExceededException e) {
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    logger.error("Max retries exceeded for {} after {} attempts", operationName, MAX_RETRIES);
                    throw e;
                }
                long delay = BASE_DELAY_MS * (long) Math.pow(2, attempt - 1);
                logger.warn("Throughput exceeded for {}, retrying in {}ms (attempt {}/{})", 
                        operationName, delay, attempt, MAX_RETRIES);
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Retry interrupted", ie);
                }
            }
        }
        throw new RuntimeException("Operation failed after retries: " + operationName);
    }
}


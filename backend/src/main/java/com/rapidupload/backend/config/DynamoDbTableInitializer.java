package com.rapidupload.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.List;

@Component
public class DynamoDbTableInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DynamoDbTableInitializer.class);

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.tables.properties}")
    private String propertiesTableName;

    @Value("${aws.dynamodb.tables.photos}")
    private String photosTableName;

    public DynamoDbTableInitializer(DynamoDbClient dynamoDbClient) {
        this.dynamoDbClient = dynamoDbClient;
    }

    @Override
    public void run(String... args) {
        try {
            createPropertiesTable();
            createPhotosTable();
            logger.info("DynamoDB tables initialized successfully");
        } catch (Exception e) {
            logger.error("Error initializing DynamoDB tables", e);
        }
    }

    private void createPropertiesTable() {
        try {
            // Check if table exists
            try {
                dynamoDbClient.describeTable(DescribeTableRequest.builder()
                        .tableName(propertiesTableName)
                        .build());
                logger.info("Properties table already exists: {}", propertiesTableName);
                return;
            } catch (ResourceNotFoundException e) {
                // Table doesn't exist, create it
            }

            CreateTableRequest createTableRequest = CreateTableRequest.builder()
                    .tableName(propertiesTableName)
                    .billingMode(BillingMode.PAY_PER_REQUEST)
                    .attributeDefinitions(
                            AttributeDefinition.builder()
                                    .attributeName("PropertyID")
                                    .attributeType(ScalarAttributeType.S)
                                    .build()
                    )
                    .keySchema(
                            KeySchemaElement.builder()
                                    .attributeName("PropertyID")
                                    .keyType(KeyType.HASH)
                                    .build()
                    )
                    .build();

            dynamoDbClient.createTable(createTableRequest);
            logger.info("Created Properties table: {}", propertiesTableName);
        } catch (ResourceInUseException e) {
            logger.info("Properties table already exists: {}", propertiesTableName);
        } catch (Exception e) {
            logger.error("Error creating Properties table", e);
        }
    }

    private void createPhotosTable() {
        try {
            // Check if table exists
            try {
                dynamoDbClient.describeTable(DescribeTableRequest.builder()
                        .tableName(photosTableName)
                        .build());
                logger.info("Photos table already exists: {}", photosTableName);
                return;
            } catch (ResourceNotFoundException e) {
                // Table doesn't exist, create it
            }

            CreateTableRequest createTableRequest = CreateTableRequest.builder()
                    .tableName(photosTableName)
                    .billingMode(BillingMode.PAY_PER_REQUEST)
                    .attributeDefinitions(
                            AttributeDefinition.builder()
                                    .attributeName("PhotoID")
                                    .attributeType(ScalarAttributeType.S)
                                    .build(),
                            AttributeDefinition.builder()
                                    .attributeName("PropertyID")
                                    .attributeType(ScalarAttributeType.S)
                                    .build()
                    )
                    .keySchema(
                            KeySchemaElement.builder()
                                    .attributeName("PhotoID")
                                    .keyType(KeyType.HASH)
                                    .build()
                    )
                    .globalSecondaryIndexes(
                            GlobalSecondaryIndex.builder()
                                    .indexName("PropertyID-index")
                                    .keySchema(
                                            KeySchemaElement.builder()
                                                    .attributeName("PropertyID")
                                                    .keyType(KeyType.HASH)
                                                    .build()
                                    )
                                    .projection(Projection.builder()
                                            .projectionType(ProjectionType.ALL)
                                            .build())
                                    .build()
                    )
                    .billingMode(BillingMode.PAY_PER_REQUEST)
                    .build();

            dynamoDbClient.createTable(createTableRequest);
            logger.info("Created Photos table with GSI: {}", photosTableName);
        } catch (ResourceInUseException e) {
            logger.info("Photos table already exists: {}", photosTableName);
        } catch (Exception e) {
            logger.error("Error creating Photos table", e);
        }
    }
}


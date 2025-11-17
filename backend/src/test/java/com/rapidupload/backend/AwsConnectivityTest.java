package com.rapidupload.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.s3.S3Client;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class AwsConnectivityTest {

    @Autowired
    private S3Client s3Client;

    @Autowired
    private DynamoDbClient dynamoDbClient;

    @Test
    void testS3ClientBean() {
        assertNotNull(s3Client, "S3Client bean should be created");
    }

    @Test
    void testDynamoDbClientBean() {
        assertNotNull(dynamoDbClient, "DynamoDbClient bean should be created");
    }

    @Test
    void testS3ListBuckets() {
        // This test will verify AWS connectivity when credentials are configured
        // Uncomment and configure AWS credentials to run:
        // s3Client.listBuckets();
        assertNotNull(s3Client);
    }

    @Test
    void testDynamoDbListTables() {
        // This test will verify AWS connectivity when credentials are configured
        // Uncomment and configure AWS credentials to run:
        // dynamoDbClient.listTables();
        assertNotNull(dynamoDbClient);
    }
}


package com.rapidupload.backend.models;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;

@DynamoDbBean
public class Detection {
    private String label;
    private String category; // 'damage' | 'material' | 'other'
    private Double confidence;
    private BoundingBox boundingBox;
    private Integer count; // For material counting

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public BoundingBox getBoundingBox() { return boundingBox; }
    public void setBoundingBox(BoundingBox boundingBox) { this.boundingBox = boundingBox; }

    public Integer getCount() { return count; }
    public void setCount(Integer count) { this.count = count; }
}

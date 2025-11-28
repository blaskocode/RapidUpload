package com.rapidupload.backend.models;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;

@DynamoDbBean
public class BoundingBox {
    private Double left;   // 0-1 percentage from left edge
    private Double top;    // 0-1 percentage from top edge
    private Double width;  // 0-1 percentage of image width
    private Double height; // 0-1 percentage of image height

    public Double getLeft() { return left; }
    public void setLeft(Double left) { this.left = left; }

    public Double getTop() { return top; }
    public void setTop(Double top) { this.top = top; }

    public Double getWidth() { return width; }
    public void setWidth(Double width) { this.width = width; }

    public Double getHeight() { return height; }
    public void setHeight(Double height) { this.height = height; }
}

package com.rapidupload.backend.models;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;

@DynamoDbBean
public class Detection {
    private String label;
    private String category; // 'damage' | 'material' | 'loose_material' | 'other'
    private Double confidence;
    private BoundingBox boundingBox;
    private Integer count; // For material counting

    // Volume estimation fields (for loose materials)
    private Double volumeEstimate;        // Estimated volume in cubic yards
    private String volumeUnit;            // "cubic_yards"
    private String volumeConfidence;      // "high" | "medium" | "low" | "none"
    private String volumeReference;       // Reference object used for scale
    private String volumeNotes;           // Explanation or notes
    private Double userVolumeOverride;    // User-confirmed volume (overrides AI estimate)

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

    // Volume getters/setters
    public Double getVolumeEstimate() { return volumeEstimate; }
    public void setVolumeEstimate(Double volumeEstimate) { this.volumeEstimate = volumeEstimate; }

    public String getVolumeUnit() { return volumeUnit; }
    public void setVolumeUnit(String volumeUnit) { this.volumeUnit = volumeUnit; }

    public String getVolumeConfidence() { return volumeConfidence; }
    public void setVolumeConfidence(String volumeConfidence) { this.volumeConfidence = volumeConfidence; }

    public String getVolumeReference() { return volumeReference; }
    public void setVolumeReference(String volumeReference) { this.volumeReference = volumeReference; }

    public String getVolumeNotes() { return volumeNotes; }
    public void setVolumeNotes(String volumeNotes) { this.volumeNotes = volumeNotes; }

    public Double getUserVolumeOverride() { return userVolumeOverride; }
    public void setUserVolumeOverride(Double userVolumeOverride) { this.userVolumeOverride = userVolumeOverride; }
}

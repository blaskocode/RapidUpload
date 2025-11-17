package com.rapidupload.backend.dto;

import java.util.List;
import java.util.Map;

public class PagedPhotoResponse {
    private List<PhotoResponse> items;
    private Map<String, String> lastEvaluatedKey;
    private boolean hasMore;

    public PagedPhotoResponse() {
    }

    public PagedPhotoResponse(List<PhotoResponse> items, Map<String, String> lastEvaluatedKey, boolean hasMore) {
        this.items = items;
        this.lastEvaluatedKey = lastEvaluatedKey;
        this.hasMore = hasMore;
    }

    public List<PhotoResponse> getItems() {
        return items;
    }

    public void setItems(List<PhotoResponse> items) {
        this.items = items;
    }

    public Map<String, String> getLastEvaluatedKey() {
        return lastEvaluatedKey;
    }

    public void setLastEvaluatedKey(Map<String, String> lastEvaluatedKey) {
        this.lastEvaluatedKey = lastEvaluatedKey;
    }

    public boolean isHasMore() {
        return hasMore;
    }

    public void setHasMore(boolean hasMore) {
        this.hasMore = hasMore;
    }
}


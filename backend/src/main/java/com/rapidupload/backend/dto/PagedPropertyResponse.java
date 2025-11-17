package com.rapidupload.backend.dto;

import java.util.List;
import java.util.Map;

public class PagedPropertyResponse {
    private List<PropertyResponse> items;
    private Map<String, String> lastEvaluatedKey;
    private boolean hasMore;

    public PagedPropertyResponse() {
    }

    public PagedPropertyResponse(List<PropertyResponse> items, Map<String, String> lastEvaluatedKey, boolean hasMore) {
        this.items = items;
        this.lastEvaluatedKey = lastEvaluatedKey;
        this.hasMore = hasMore;
    }

    public List<PropertyResponse> getItems() {
        return items;
    }

    public void setItems(List<PropertyResponse> items) {
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


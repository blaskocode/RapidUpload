package com.rapidupload.backend.models;

import java.util.List;
import java.util.Map;

public class PagedResponse<T> {
    private List<T> items;
    private Map<String, String> lastEvaluatedKey;
    private boolean hasMore;

    public PagedResponse() {
    }

    public PagedResponse(List<T> items, Map<String, String> lastEvaluatedKey, boolean hasMore) {
        this.items = items;
        this.lastEvaluatedKey = lastEvaluatedKey;
        this.hasMore = hasMore;
    }

    public List<T> getItems() {
        return items;
    }

    public void setItems(List<T> items) {
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


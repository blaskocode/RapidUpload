package com.rapidupload.backend.exceptions;

public class PropertyNotFoundException extends RuntimeException {
    public PropertyNotFoundException(String propertyId) {
        super("Property not found: " + propertyId);
    }
}


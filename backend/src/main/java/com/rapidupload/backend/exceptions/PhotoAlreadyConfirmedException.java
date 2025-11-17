package com.rapidupload.backend.exceptions;

public class PhotoAlreadyConfirmedException extends RuntimeException {
    public PhotoAlreadyConfirmedException(String photoId) {
        super("Photo already confirmed: " + photoId);
    }
}


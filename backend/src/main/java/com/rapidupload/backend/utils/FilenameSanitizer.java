package com.rapidupload.backend.utils;

import java.text.Normalizer;
import java.util.regex.Pattern;

public class FilenameSanitizer {

    private static final Pattern SPECIAL_CHARS = Pattern.compile("[^a-zA-Z0-9._-]");
    private static final Pattern PATH_TRAVERSAL = Pattern.compile("\\.\\./|\\.\\.\\\\|/|\\\\");
    private static final int MAX_FILENAME_LENGTH = 100;

    /**
     * Sanitizes a filename to prevent path traversal attacks and handle special characters.
     * 
     * @param filename The original filename
     * @return Sanitized filename safe for use in S3 keys
     * @throws IllegalArgumentException if filename is null
     */
    public static String sanitize(String filename) {
        if (filename == null) {
            throw new IllegalArgumentException("Filename cannot be null");
        }

        // Normalize Unicode characters to NFC form
        String normalized = Normalizer.normalize(filename, Normalizer.Form.NFC);

        // Remove path traversal sequences and path separators
        normalized = PATH_TRAVERSAL.matcher(normalized).replaceAll("_");

        // Extract file extension
        int lastDot = normalized.lastIndexOf('.');
        String nameWithoutExt = lastDot > 0 ? normalized.substring(0, lastDot) : normalized;
        String extension = lastDot > 0 ? normalized.substring(lastDot) : "";

        // Remove leading/trailing whitespace and dots
        nameWithoutExt = nameWithoutExt.trim().replaceAll("^\\.+|\\.+$", "");

        // Replace special characters with underscores
        nameWithoutExt = SPECIAL_CHARS.matcher(nameWithoutExt).replaceAll("_");

        // Handle empty filename after sanitization
        if (nameWithoutExt.isEmpty()) {
            nameWithoutExt = "file";
        }

        // Limit length (excluding extension)
        if (nameWithoutExt.length() > MAX_FILENAME_LENGTH) {
            nameWithoutExt = nameWithoutExt.substring(0, MAX_FILENAME_LENGTH);
        }

        return nameWithoutExt + extension;
    }
}


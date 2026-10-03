package org.example.enterprisedaynews.service;

/**
 * Upload file names come from the user's browser, so they're tidied before use: never trusted to choose
 * a folder, and only safe characters on disk.
 */
public final class UploadFileNames {

    private static final int MAX_LENGTH = 120;

    private UploadFileNames() {
    }

    /** The name to show people: just the last part of what the browser sent (no folders), at most 120 characters. */
    public static String displayName(String submitted) {
        String name = submitted == null ? "" : submitted.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).strip();
        if (name.length() > MAX_LENGTH) {
            name = name.substring(name.length() - MAX_LENGTH);
        }
        return name.isEmpty() ? "image" : name;
    }

    /** The name used on disk: only letters, digits, dot, dash and underscore, and never starting with a dot. */
    public static String storageName(String displayName) {
        String safe = displayName.replaceAll("[^A-Za-z0-9._-]", "_").replaceAll("^\\.+", "");
        return safe.isEmpty() ? "image" : safe;
    }
}

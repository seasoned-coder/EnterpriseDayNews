package org.example.enterprisedaynews.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Username and password rules shared by student and staff accounts. */
final class PasswordPolicy {

    static final int STUDENT_MIN_LENGTH = 6;
    static final int STAFF_MIN_LENGTH = 10;

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._-]+$");
    private static final Set<String> COMMON_PASSWORD_BLOCKLIST = Set.of(
            "password", "password1", "password123", "qwerty", "qwerty123",
            "123456", "1234567", "12345678", "abc123", "letmein",
            "student", "student1", "school", "welcome", "admin", "enterprise"
    );

    private PasswordPolicy() {
    }

    /** Trimmed, lower-case username, or {@code null} if blank. */
    static String normalizeUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            return null;
        }
        return username.trim().toLowerCase(Locale.ROOT);
    }

    static String normalizeAndValidateUsername(String username) {
        String normalized = normalizeUsername(username);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        if (!USERNAME_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Username may only contain letters, numbers, dots, dashes, and underscores");
        }
        return normalized;
    }

    /** Password typed at sign-in: only checked for presence. */
    static String normalizeLoginPassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required");
        }
        return password.trim();
    }

    /** Password being set on an account: must meet the strength rules. */
    static String validateNewPassword(String password, int minLength) {
        String normalized = normalizeLoginPassword(password);
        if (normalized.length() < minLength) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must be at least " + minLength + " characters long");
        }

        boolean hasUppercase = normalized.chars().anyMatch(Character::isUpperCase);
        boolean hasDigit = normalized.chars().anyMatch(Character::isDigit);
        if (!hasUppercase || !hasDigit) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must include at least one uppercase letter and one number");
        }

        if (COMMON_PASSWORD_BLOCKLIST.contains(normalized.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Please choose a stronger password");
        }

        return normalized;
    }
}

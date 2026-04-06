package com.activecity.api.cm;

import java.util.regex.Pattern;

/**
 * Static validation utility.
 *
 * <p>All methods throw {@link ApiErrorResponse} with HTTP 400 on failure.
 * Never use {@code @Valid} or Bean Validation in the {@code pub/} layer —
 * always call these methods explicitly in the service.</p>
 */
public final class CommonValidator {

    private CommonValidator() {}

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    /**
     * Fails if {@code value} is null or blank.
     *
     * @param value     the value to check
     * @param fieldName human-readable field label used in the error message
     */
    public static void requireNonBlank(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ApiErrorResponse(400, "VALIDATION_ERROR", fieldName + " is required");
        }
    }

    /**
     * Fails if {@code email} is null, blank, or does not match a basic email regex.
     *
     * @param email the email address to validate
     */
    public static void requireValidEmail(String email) {
        requireNonBlank(email, "Email");
        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new ApiErrorResponse(400, "VALIDATION_ERROR", "Email address is not valid");
        }
    }

    /**
     * Fails if {@code value} has fewer than {@code min} characters after trimming.
     *
     * @param value     the value to check
     * @param fieldName human-readable field label
     * @param min       minimum required character length
     */
    public static void requireMinLength(String value, String fieldName, int min) {
        requireNonBlank(value, fieldName);
        if (value.trim().length() < min) {
            throw new ApiErrorResponse(400, "VALIDATION_ERROR",
                    fieldName + " must be at least " + min + " characters");
        }
    }

    /**
     * Fails if {@code a} and {@code b} are not equal (case-sensitive).
     * Typically used to confirm password matches.
     *
     * @param a         first value
     * @param b         second value to compare against
     * @param fieldName human-readable label (e.g. "Confirm password")
     */
    public static void requireMatch(String a, String b, String fieldName) {
        if (a == null || !a.equals(b)) {
            throw new ApiErrorResponse(400, "VALIDATION_ERROR", fieldName + " does not match");
        }
    }
}

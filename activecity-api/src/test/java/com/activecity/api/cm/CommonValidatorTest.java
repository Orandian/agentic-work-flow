package com.activecity.api.cm;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.*;

/**
 * Pure unit tests for {@link CommonValidator}.
 *
 * No Spring context, no mocks — just the static utility methods.
 */
class CommonValidatorTest {

    // =========================================================
    // requireNonBlank
    // =========================================================

    @ParameterizedTest(name = "requireNonBlank throws for [{0}]")
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t", "\n"})
    void requireNonBlank_nullOrBlank_throwsValidationError(String value) {
        // When / Then
        assertThatThrownBy(() -> CommonValidator.requireNonBlank(value, "Field"))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                    assertThat(err.getMessage()).contains("Field");
                    assertThat(err.getMessage()).contains("required");
                });
    }

    @Test
    void requireNonBlank_validValue_doesNotThrow() {
        // When / Then — no exception expected
        assertThatCode(() -> CommonValidator.requireNonBlank("hello", "Field"))
                .doesNotThrowAnyException();
    }

    @Test
    void requireNonBlank_valueWithSpaces_doesNotThrow() {
        // "  hello  " is not blank — isBlank() checks only whitespace-only strings
        assertThatCode(() -> CommonValidator.requireNonBlank("  hello  ", "Field"))
                .doesNotThrowAnyException();
    }

    // =========================================================
    // requireValidEmail
    // =========================================================

    @ParameterizedTest(name = "requireValidEmail throws for [{0}]")
    @NullAndEmptySource
    @ValueSource(strings = {
            "   ",
            "notanemail",
            "missing@",
            "@nodomain.com",
            "no-at-sign",
            "double@@domain.com",
            "user@domain",        // no TLD extension
            "user @domain.com",   // space in local part
    })
    void requireValidEmail_invalidFormats_throwsValidationError(String email) {
        // When / Then
        assertThatThrownBy(() -> CommonValidator.requireValidEmail(email))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                });
    }

    @ParameterizedTest(name = "requireValidEmail passes for [{0}]")
    @ValueSource(strings = {
            "user@example.com",
            "user.name+tag@sub.domain.org",
            "user_123@domain.io",
            "USER@DOMAIN.COM",
    })
    void requireValidEmail_validFormats_doesNotThrow(String email) {
        // When / Then
        assertThatCode(() -> CommonValidator.requireValidEmail(email))
                .doesNotThrowAnyException();
    }

    // =========================================================
    // requireMinLength
    // =========================================================

    @Test
    void requireMinLength_belowMinimum_throwsValidationError() {
        // Given — value has 4 chars, min is 8
        assertThatThrownBy(() -> CommonValidator.requireMinLength("Pass", "Password", 8))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                    assertThat(err.getMessage()).contains("Password");
                    assertThat(err.getMessage()).contains("8 characters");
                });
    }

    @Test
    void requireMinLength_exactMinimum_doesNotThrow() {
        // Given — "Password" is exactly 8 chars
        assertThatCode(() -> CommonValidator.requireMinLength("Password", "Password", 8))
                .doesNotThrowAnyException();
    }

    @Test
    void requireMinLength_aboveMinimum_doesNotThrow() {
        // Given — "LongPassword1!" is more than 8 chars
        assertThatCode(() -> CommonValidator.requireMinLength("LongPassword1!", "Password", 8))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "requireMinLength throws for blank value [{0}]")
    @NullAndEmptySource
    @ValueSource(strings = {"   "})
    void requireMinLength_blankOrNull_throwsValidationError(String value) {
        // requireMinLength delegates to requireNonBlank first
        assertThatThrownBy(() -> CommonValidator.requireMinLength(value, "Field", 8))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                });
    }

    @Test
    void requireMinLength_valueTrimmedBelowMin_throwsValidationError() {
        // "  ab  " trims to "ab" (2 chars) — below min of 8
        assertThatThrownBy(() -> CommonValidator.requireMinLength("  ab  ", "Field", 8))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                });
    }

    // =========================================================
    // requireMatch
    // =========================================================

    @Test
    void requireMatch_mismatchedValues_throwsValidationError() {
        // Given
        assertThatThrownBy(() -> CommonValidator.requireMatch("Password1!", "Different1!", "Confirm password"))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                    assertThat(err.getMessage()).contains("Confirm password");
                    assertThat(err.getMessage()).contains("does not match");
                });
    }

    @Test
    void requireMatch_nullFirstValue_throwsValidationError() {
        // Given — null a should fail the null guard
        assertThatThrownBy(() -> CommonValidator.requireMatch(null, "Password1!", "Confirm password"))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                });
    }

    @Test
    void requireMatch_matchingValues_doesNotThrow() {
        // When / Then
        assertThatCode(() -> CommonValidator.requireMatch("Password1!", "Password1!", "Confirm password"))
                .doesNotThrowAnyException();
    }

    @Test
    void requireMatch_caseSensitive_throwsForDifferentCase() {
        // "Password1!" != "password1!" — case-sensitive comparison
        assertThatThrownBy(() -> CommonValidator.requireMatch("Password1!", "password1!", "Confirm password"))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    assertThat(((ApiErrorResponse) ex).getStatus()).isEqualTo(400);
                });
    }
}

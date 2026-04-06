package com.activecity.api.config;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.entity.User;
import com.activecity.api.cm.enums.UserRole;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for {@link UserAuthProvider}.
 *
 * <p>No Spring context. ReflectionTestUtils injects the {@code @Value} fields
 * ({@code secret} and {@code expiryHours}) directly.</p>
 */
@ExtendWith(MockitoExtension.class)
class UserAuthProviderTest {

    /**
     * Must be at least 32 characters to pass the {@code @PostConstruct} guard.
     */
    private static final String TEST_SECRET =
            "test-secret-key-at-least-32-chars!!";

    private UserAuthProvider userAuthProvider;

    @BeforeEach
    void setUp() {
        userAuthProvider = new UserAuthProvider();
        ReflectionTestUtils.setField(userAuthProvider, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(userAuthProvider, "expiryHours", 8L);
        // Manually call @PostConstruct because Spring is not running
        userAuthProvider.validateSecret();
    }

    // =========================================================
    // Helpers
    // =========================================================

    private User sampleUser() {
        return User.builder()
                .id(42L)
                .email("staff@activecity.test")
                .fullName("Staff Member")
                .role(UserRole.STAFF)
                .isActive(true)
                .build();
    }

    // =========================================================
    // createToken
    // =========================================================

    @Test
    void createToken_validUser_returnsValidJwt() {
        // Given
        User user = sampleUser();

        // When
        String token = userAuthProvider.createToken(user);

        // Then — token must be non-blank and decodable with the same secret
        assertThat(token).isNotBlank();

        DecodedJWT decoded = JWT.require(Algorithm.HMAC256(TEST_SECRET))
                .build()
                .verify(token);

        assertThat(decoded.getSubject()).isEqualTo("staff@activecity.test");
        assertThat(decoded.getClaim("userId").asLong()).isEqualTo(42L);
        assertThat(decoded.getClaim("role").asString()).isEqualTo("STAFF");
        assertThat(decoded.getExpiresAt()).isAfter(new Date());
    }

    @Test
    void createToken_tokenContainsExpiry8HoursFromNow() {
        // Given
        User user = sampleUser();

        // When
        String token = userAuthProvider.createToken(user);

        // Then — expiry should be approximately 8 hours from now (within a 10-second window)
        DecodedJWT decoded = JWT.require(Algorithm.HMAC256(TEST_SECRET))
                .build()
                .verify(token);

        Instant expectedExpiry = Instant.now().plus(8, ChronoUnit.HOURS);
        Instant actualExpiry   = decoded.getExpiresAt().toInstant();

        // Allow ± 10 seconds for test execution time
        assertThat(actualExpiry).isBetween(
                expectedExpiry.minusSeconds(10),
                expectedExpiry.plusSeconds(10)
        );
    }

    // =========================================================
    // validateToken
    // =========================================================

    @Test
    void validateToken_validToken_returnsDecodedJwt() {
        // Given
        User user = sampleUser();
        String token = userAuthProvider.createToken(user);

        // When
        DecodedJWT decoded = userAuthProvider.validateToken(token);

        // Then
        assertThat(decoded).isNotNull();
        assertThat(decoded.getSubject()).isEqualTo("staff@activecity.test");
        assertThat(decoded.getClaim("userId").asLong()).isEqualTo(42L);
        assertThat(decoded.getClaim("role").asString()).isEqualTo("STAFF");
    }

    @Test
    void validateToken_expiredToken_throwsApiErrorResponse() {
        // Given — build a token with expiry in the past
        String expiredToken = JWT.create()
                .withSubject("staff@activecity.test")
                .withClaim("userId", 42L)
                .withClaim("role", "STAFF")
                .withIssuedAt(Date.from(Instant.now().minusSeconds(3600)))
                .withExpiresAt(Date.from(Instant.now().minusSeconds(1)))  // already expired
                .sign(Algorithm.HMAC256(TEST_SECRET));

        // When / Then
        assertThatThrownBy(() -> userAuthProvider.validateToken(expiredToken))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(401);
                    assertThat(err.getCode()).isEqualTo("INVALID_TOKEN");
                    assertThat(err.getMessage()).contains("invalid or has expired");
                });
    }

    @Test
    void validateToken_tamperedToken_throwsApiErrorResponse() {
        // Given — sign with a different secret so verification will fail
        String tamperedToken = JWT.create()
                .withSubject("staff@activecity.test")
                .withClaim("userId", 42L)
                .withClaim("role", "STAFF")
                .withIssuedAt(Date.from(Instant.now()))
                .withExpiresAt(Date.from(Instant.now().plus(8, ChronoUnit.HOURS)))
                .sign(Algorithm.HMAC256("completely-different-secret-value!!"));

        // When / Then
        assertThatThrownBy(() -> userAuthProvider.validateToken(tamperedToken))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(401);
                    assertThat(err.getCode()).isEqualTo("INVALID_TOKEN");
                });
    }

    @Test
    void validateToken_randomGarbage_throwsApiErrorResponse() {
        // Given — completely invalid token string
        assertThatThrownBy(() -> userAuthProvider.validateToken("not.a.jwt"))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    assertThat(((ApiErrorResponse) ex).getStatus()).isEqualTo(401);
                    assertThat(((ApiErrorResponse) ex).getCode()).isEqualTo("INVALID_TOKEN");
                });
    }
}

package com.activecity.api.config;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.entity.User;
import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Handles JWT creation and validation using auth0 java-jwt.
 *
 * <p>JWT claims:
 * <ul>
 *   <li>{@code sub}    — user email</li>
 *   <li>{@code userId} — user primary key</li>
 *   <li>{@code role}   — {@code UserRole} name (e.g. "STAFF", "ADMIN")</li>
 *   <li>{@code iat}    — issued-at timestamp</li>
 *   <li>{@code exp}    — expiry timestamp</li>
 * </ul>
 * </p>
 */
@Component
public class UserAuthProvider {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiry-hours:8}")
    private long expiryHours;

    @PostConstruct
    public void validateSecret() {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret must be at least 32 characters. " +
                    "Set the JWT_SECRET environment variable.");
        }
    }

    /**
     * Creates a signed JWT for the given user.
     *
     * @param user the authenticated user
     * @return signed JWT string
     */
    public String createToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(expiryHours, ChronoUnit.HOURS);

        return JWT.create()
                .withSubject(user.getEmail())
                .withClaim("userId", user.getId())
                .withClaim("role", user.getRole().name())
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(expiry))
                .sign(Algorithm.HMAC256(secret));
    }

    /**
     * Validates and decodes a JWT string.
     *
     * @param token the raw JWT string from the Authorization header
     * @return decoded JWT carrying all claims
     * @throws ApiErrorResponse HTTP 401 if the token is invalid or expired
     */
    public DecodedJWT validateToken(String token) {
        try {
            JWTVerifier verifier = JWT.require(Algorithm.HMAC256(secret)).build();
            return verifier.verify(token);
        } catch (Exception e) {
            throw new ApiErrorResponse(401, "INVALID_TOKEN", "Token is invalid or has expired");
        }
    }
}

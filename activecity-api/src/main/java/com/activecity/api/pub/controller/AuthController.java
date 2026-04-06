package com.activecity.api.pub.controller;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.pub.dto.*;
import com.activecity.api.pub.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.LinkedHashMap;

/**
 * Public authentication endpoints.
 *
 * <p>Zero business logic — each handler delegates entirely to {@link AuthService}
 * and returns {@code ResponseEntity<Object>}.</p>
 *
 * <p>A single {@code @ExceptionHandler} converts {@link ApiErrorResponse} exceptions
 * (thrown by the service layer) into structured HTTP responses.</p>
 */
@RestController
@RequestMapping("/pub")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // -------------------------------------------------------------------------
    // POST /pub/register
    // -------------------------------------------------------------------------

    @PostMapping("/register")
    public ResponseEntity<Object> register(@RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    // -------------------------------------------------------------------------
    // POST /pub/verify-otp
    // -------------------------------------------------------------------------

    @PostMapping("/verify-otp")
    public ResponseEntity<Object> verifyOtp(@RequestBody VerifyOtpRequest req) {
        return ResponseEntity.ok(authService.verifyOtp(req));
    }

    // -------------------------------------------------------------------------
    // POST /pub/login
    // -------------------------------------------------------------------------

    @PostMapping("/login")
    public ResponseEntity<Object> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    // -------------------------------------------------------------------------
    // POST /pub/forgot-password
    // -------------------------------------------------------------------------

    @PostMapping("/forgot-password")
    public ResponseEntity<Object> forgotPassword(@RequestBody ForgotPasswordRequest req) {
        return ResponseEntity.ok(authService.forgotPassword(req));
    }

    // -------------------------------------------------------------------------
    // POST /pub/reset-password
    // -------------------------------------------------------------------------

    @PostMapping("/reset-password")
    public ResponseEntity<Object> resetPassword(@RequestBody ResetPasswordRequest req) {
        return ResponseEntity.ok(authService.resetPassword(req));
    }

    // -------------------------------------------------------------------------
    // Global exception handler — ApiErrorResponse → structured HTTP response
    // -------------------------------------------------------------------------

    @ExceptionHandler(ApiErrorResponse.class)
    public ResponseEntity<Object> handleApiError(ApiErrorResponse ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("status", ex.getStatus());
        body.put("code", ex.getCode());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(ex.getStatus()).body(body);
    }
}

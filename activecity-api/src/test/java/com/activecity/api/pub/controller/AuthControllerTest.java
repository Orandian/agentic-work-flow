package com.activecity.api.pub.controller;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import com.activecity.api.cm.CommonMessage;
import com.activecity.api.config.AuthorizeRequest;
import com.activecity.api.config.UserAuthProvider;
import com.activecity.api.pub.dto.*;
import com.activecity.api.pub.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Slice test for {@link AuthController}.
 *
 * <p>{@code @WebMvcTest} loads the security config beans ({@link com.activecity.api.config.SecurityConfig},
 * {@link AuthorizeRequest}, {@link UserAuthProvider}) because they are in the application's
 * config package. Both security-infrastructure beans are provided as {@code @MockBean} so
 * that the {@link com.activecity.api.config.SecurityConfig} can wire up without hitting
 * real crypto or JWT logic.</p>
 *
 * <p>Each test is annotated with {@code @WithMockUser} so the test request is treated as
 * authenticated and passes through the security filter chain.</p>
 */
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    /**
     * Required because SecurityConfig depends on AuthorizeRequest as a constructor argument.
     * The mock satisfies the dependency; the real bean is not needed for controller-layer tests.
     */
    @MockBean
    private AuthorizeRequest authorizeRequest;

    /**
     * Required because SecurityConfig depends on UserAuthProvider as a constructor argument,
     * and JwtAuthFilter is constructed with it inside SecurityConfig.
     */
    @MockBean
    private UserAuthProvider userAuthProvider;

    @Autowired
    private ObjectMapper objectMapper;

    // =========================================================
    // POST /pub/register
    // =========================================================

    @Test
    @WithMockUser
    void register_validPayload_returns200() throws Exception {
        // Given
        RegisterRequest req = new RegisterRequest(
                "user@example.com", "Password1!", "Password1!", "John Doe");
        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(ApiResponse.ok(CommonMessage.OTP_SENT));

        // When / Then
        mockMvc.perform(post("/pub/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(CommonMessage.OTP_SENT));
    }

    @Test
    @WithMockUser
    void register_duplicateEmail_returns409() throws Exception {
        // Given
        RegisterRequest req = new RegisterRequest(
                "taken@example.com", "Password1!", "Password1!", "John Doe");
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new ApiErrorResponse(409, "EMAIL_EXISTS", CommonMessage.EMAIL_ALREADY_EXISTS));

        // When / Then
        mockMvc.perform(post("/pub/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("EMAIL_EXISTS"))
                .andExpect(jsonPath("$.message").value(CommonMessage.EMAIL_ALREADY_EXISTS));
    }

    // =========================================================
    // POST /pub/login
    // =========================================================

    @Test
    @WithMockUser
    void login_validCredentials_returns200() throws Exception {
        // Given
        LoginRequest req = new LoginRequest("user@example.com", "Password1!");
        AuthResponse authResponse = new AuthResponse("jwt.token.here", "STAFF", "John Doe", "user@example.com");
        when(authService.login(any(LoginRequest.class)))
                .thenReturn(ApiResponse.ok(CommonMessage.LOGIN_SUCCESS, authResponse));

        // When / Then
        mockMvc.perform(post("/pub/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(CommonMessage.LOGIN_SUCCESS))
                .andExpect(jsonPath("$.data.token").value("jwt.token.here"))
                .andExpect(jsonPath("$.data.role").value("STAFF"))
                .andExpect(jsonPath("$.data.fullName").value("John Doe"))
                .andExpect(jsonPath("$.data.email").value("user@example.com"));
    }

    @Test
    @WithMockUser
    void login_invalidCredentials_returns401() throws Exception {
        // Given
        LoginRequest req = new LoginRequest("user@example.com", "WrongPass1!");
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new ApiErrorResponse(401, "INVALID_CREDENTIALS", CommonMessage.INVALID_CREDENTIALS));

        // When / Then
        mockMvc.perform(post("/pub/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"))
                .andExpect(jsonPath("$.message").value(CommonMessage.INVALID_CREDENTIALS));
    }

    // =========================================================
    // POST /pub/verify-otp
    // =========================================================

    @Test
    @WithMockUser
    void verifyOtp_validOtp_returns200() throws Exception {
        // Given
        VerifyOtpRequest req = new VerifyOtpRequest("user@example.com", "123456");
        when(authService.verifyOtp(any(VerifyOtpRequest.class)))
                .thenReturn(ApiResponse.ok(CommonMessage.REGISTRATION_SUCCESS));

        // When / Then
        mockMvc.perform(post("/pub/verify-otp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(CommonMessage.REGISTRATION_SUCCESS));
    }

    // =========================================================
    // POST /pub/forgot-password
    // =========================================================

    @Test
    @WithMockUser
    void forgotPassword_validEmail_returns200() throws Exception {
        // Given
        ForgotPasswordRequest req = new ForgotPasswordRequest("user@example.com");
        when(authService.forgotPassword(any(ForgotPasswordRequest.class)))
                .thenReturn(ApiResponse.ok(CommonMessage.OTP_SENT));

        // When / Then
        mockMvc.perform(post("/pub/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(CommonMessage.OTP_SENT));
    }

    // =========================================================
    // POST /pub/reset-password
    // =========================================================

    @Test
    @WithMockUser
    void resetPassword_validPayload_returns200() throws Exception {
        // Given
        ResetPasswordRequest req = new ResetPasswordRequest(
                "user@example.com", "123456", "NewPassword1!", "NewPassword1!");
        when(authService.resetPassword(any(ResetPasswordRequest.class)))
                .thenReturn(ApiResponse.ok(CommonMessage.PASSWORD_RESET_SUCCESS));

        // When / Then
        mockMvc.perform(post("/pub/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(CommonMessage.PASSWORD_RESET_SUCCESS));
    }

    // =========================================================
    // Exception handler — structured error body shape
    // =========================================================

    @Test
    @WithMockUser
    void exceptionHandler_returnsStructuredErrorBody() throws Exception {
        // Given — any endpoint that triggers ApiErrorResponse
        LoginRequest req = new LoginRequest("user@example.com", "Pass");
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new ApiErrorResponse(403, "ACCOUNT_NOT_ACTIVE", CommonMessage.ACCOUNT_NOT_ACTIVE));

        // When / Then — verify all four keys are present in the response body
        mockMvc.perform(post("/pub/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").exists())
                .andExpect(jsonPath("$.status").exists())
                .andExpect(jsonPath("$.code").exists())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.code").value("ACCOUNT_NOT_ACTIVE"))
                .andExpect(jsonPath("$.message").value(CommonMessage.ACCOUNT_NOT_ACTIVE));
    }
}

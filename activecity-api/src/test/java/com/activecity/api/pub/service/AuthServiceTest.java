package com.activecity.api.pub.service;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import com.activecity.api.cm.CommonMessage;
import com.activecity.api.cm.entity.User;
import com.activecity.api.cm.entity.UserVerification;
import com.activecity.api.cm.enums.UserRole;
import com.activecity.api.config.UserAuthProvider;
import com.activecity.api.pub.dto.*;
import com.activecity.api.pub.repository.UserMapper;
import com.activecity.api.pub.repository.UserVerificationMapper;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import java.time.OffsetDateTime;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link AuthService}.
 *
 * <p>All mapper/encoder/provider calls are mocked.
 *
 * <p>The service's {@code catch (ApiErrorResponse e)} blocks call
 * {@code TransactionInterceptor.currentTransactionStatus().setRollbackOnly()}.
 * Because {@code @Transactional} does not run in plain unit tests, that call
 * would return {@code null} and NPE. Where the code path enters that catch block
 * we use {@link MockedStatic} to stub the static call so the test can proceed
 * to see the real {@link ApiErrorResponse} being re-thrown.</p>
 *
 * <p>Tests for validation failures that throw BEFORE any mapper call never
 * enter the catch block, so they do NOT need the MockedStatic setup.</p>
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserMapper               userMapper;
    @Mock private UserVerificationMapper   userVerificationMapper;
    @Mock private PasswordEncoder          passwordEncoder;
    @Mock private UserAuthProvider         userAuthProvider;
    @Mock private JavaMailSender           mailSender;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void injectFromAddress() {
        // Inject the @Value field that would normally be populated by Spring
        ReflectionTestUtils.setField(authService, "fromAddress", "noreply@activecity.test");
    }

    /**
     * Creates a mock {@link TransactionStatus} and stubs
     * {@code TransactionInterceptor.currentTransactionStatus()} to return it.
     * Call this inside a try-with-resources block for tests that trigger
     * the {@code catch (ApiErrorResponse e)} branch.
     */
    private MockedStatic<TransactionInterceptor> mockTransactionInterceptor() {
        MockedStatic<TransactionInterceptor> mocked = mockStatic(TransactionInterceptor.class);
        TransactionStatus txStatus = mock(TransactionStatus.class);
        mocked.when(TransactionInterceptor::currentTransactionStatus).thenReturn(txStatus);
        return mocked;
    }

    // =========================================================
    // Helpers
    // =========================================================

    private RegisterRequest validRegisterRequest() {
        return new RegisterRequest("user@example.com", "Password1!", "Password1!", "John Doe");
    }

    private User activeUser() {
        return User.builder()
                .id(1L)
                .email("user@example.com")
                .passwordHash("$2a$10$hash")
                .fullName("John Doe")
                .role(UserRole.STAFF)
                .isActive(true)
                .build();
    }

    private User inactiveUser() {
        return User.builder()
                .id(1L)
                .email("user@example.com")
                .passwordHash("$2a$10$hash")
                .fullName("John Doe")
                .role(UserRole.STAFF)
                .isActive(false)
                .build();
    }

    private UserVerification validVerification(String type) {
        return UserVerification.builder()
                .id(10L)
                .userId(1L)
                .otpCode("123456")
                .type(type)
                .expiresAt(OffsetDateTime.now().plusMinutes(15))
                .build();
    }

    private UserVerification expiredVerification(String type) {
        return UserVerification.builder()
                .id(10L)
                .userId(1L)
                .otpCode("123456")
                .type(type)
                .expiresAt(OffsetDateTime.now().minusMinutes(1))
                .build();
    }

    private MimeMessage mockMimeMessage() {
        // Mockito will stub all void methods to do nothing by default for a mock.
        // The MimeMessageHelper will call various setters on this mock; all are no-ops.
        return mock(MimeMessage.class);
    }

    // =========================================================
    // register()
    // =========================================================

    @Test
    void register_validPayload_returnsOtpSentMessage() throws Exception {
        // Given
        RegisterRequest req = validRegisterRequest();
        when(userMapper.findByEmail("user@example.com")).thenReturn(null);
        when(passwordEncoder.encode("Password1!")).thenReturn("$2a$10$hashedpwd");
        MimeMessage mimeMsg = mockMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(mimeMsg);
        doNothing().when(mailSender).send(mimeMsg);

        // When
        ApiResponse<Void> response = authService.register(req);

        // Then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo(CommonMessage.OTP_SENT);

        verify(userMapper).insertUser(any(User.class));
        verify(userVerificationMapper).insertVerification(any(UserVerification.class));
        verify(mailSender).send(mimeMsg);
    }

    @Test
    void register_duplicateEmail_throwsEmailExists() {
        // Given
        RegisterRequest req = validRegisterRequest();
        when(userMapper.findByEmail("user@example.com")).thenReturn(inactiveUser());

        // When / Then — use MockedStatic because the catch block calls
        // TransactionInterceptor.currentTransactionStatus() before re-throwing
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(409);
                        assertThat(err.getCode()).isEqualTo("EMAIL_EXISTS");
                        assertThat(err.getMessage()).isEqualTo(CommonMessage.EMAIL_ALREADY_EXISTS);
                    });
        }

        verify(userMapper, never()).insertUser(any());
    }

    @Test
    void register_blankEmail_throwsValidationError() {
        // Given
        RegisterRequest req = new RegisterRequest("", "Password1!", "Password1!", "John Doe");

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                    });
        }

        verifyNoInteractions(userMapper);
    }

    @Test
    void register_blankPassword_throwsValidationError() {
        // Given
        RegisterRequest req = new RegisterRequest("user@example.com", "", "", "John Doe");

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                    });
        }

        verifyNoInteractions(userMapper);
    }

    @Test
    void register_passwordTooShort_throwsValidationError() {
        // Given — password is only 4 chars (< 8 minimum)
        RegisterRequest req = new RegisterRequest("user@example.com", "Pass", "Pass", "John Doe");

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                        assertThat(err.getMessage()).contains("8 characters");
                    });
        }

        verifyNoInteractions(userMapper);
    }

    @Test
    void register_passwordMismatch_throwsValidationError() {
        // Given
        RegisterRequest req = new RegisterRequest(
                "user@example.com", "Password1!", "WrongConfirm1!", "John Doe");

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.register(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                        assertThat(err.getMessage()).contains("does not match");
                    });
        }

        verifyNoInteractions(userMapper);
    }

    // =========================================================
    // verifyOtp()
    // =========================================================

    @Test
    void verifyOtp_validOtp_activatesUserAndDeletesVerification() {
        // Given
        VerifyOtpRequest req = new VerifyOtpRequest("user@example.com", "123456");
        when(userMapper.findByEmail("user@example.com")).thenReturn(inactiveUser());
        when(userVerificationMapper.findByUserIdAndType(1L, "REGISTRATION"))
                .thenReturn(validVerification("REGISTRATION"));

        // When
        ApiResponse<Void> response = authService.verifyOtp(req);

        // Then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo(CommonMessage.REGISTRATION_SUCCESS);

        verify(userMapper).updateIsActive(1L, true);
        verify(userVerificationMapper).deleteByUserId(1L, "REGISTRATION");
    }

    @Test
    void verifyOtp_userNotFound_throwsNotFound() {
        // Given
        VerifyOtpRequest req = new VerifyOtpRequest("unknown@example.com", "123456");
        when(userMapper.findByEmail("unknown@example.com")).thenReturn(null);

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.verifyOtp(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(404);
                        assertThat(err.getCode()).isEqualTo("USER_NOT_FOUND");
                        assertThat(err.getMessage()).isEqualTo(CommonMessage.USER_NOT_FOUND);
                    });
        }
    }

    @Test
    void verifyOtp_noVerificationRecord_throwsInvalidOtp() {
        // Given
        VerifyOtpRequest req = new VerifyOtpRequest("user@example.com", "123456");
        when(userMapper.findByEmail("user@example.com")).thenReturn(inactiveUser());
        when(userVerificationMapper.findByUserIdAndType(1L, "REGISTRATION")).thenReturn(null);

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.verifyOtp(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("INVALID_OTP");
                        assertThat(err.getMessage()).isEqualTo(CommonMessage.INVALID_OTP);
                    });
        }
    }

    @Test
    void verifyOtp_expiredOtp_throwsOtpExpired() {
        // Given
        VerifyOtpRequest req = new VerifyOtpRequest("user@example.com", "123456");
        when(userMapper.findByEmail("user@example.com")).thenReturn(inactiveUser());
        when(userVerificationMapper.findByUserIdAndType(1L, "REGISTRATION"))
                .thenReturn(expiredVerification("REGISTRATION"));

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.verifyOtp(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("OTP_EXPIRED");
                        assertThat(err.getMessage()).isEqualTo(CommonMessage.OTP_EXPIRED);
                    });
        }
    }

    @Test
    void verifyOtp_wrongCode_throwsInvalidOtp() {
        // Given
        VerifyOtpRequest req = new VerifyOtpRequest("user@example.com", "999999");
        when(userMapper.findByEmail("user@example.com")).thenReturn(inactiveUser());
        when(userVerificationMapper.findByUserIdAndType(1L, "REGISTRATION"))
                .thenReturn(validVerification("REGISTRATION")); // code is "123456"

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.verifyOtp(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("INVALID_OTP");
                    });
        }
    }

    // =========================================================
    // login()
    // =========================================================

    @Test
    void login_validCredentials_returnsAuthResponse() {
        // Given
        LoginRequest req = new LoginRequest("user@example.com", "Password1!");
        when(userMapper.findByEmail("user@example.com")).thenReturn(activeUser());
        when(passwordEncoder.matches("Password1!", "$2a$10$hash")).thenReturn(true);
        when(userAuthProvider.createToken(any(User.class))).thenReturn("jwt.token.here");

        // When
        ApiResponse<AuthResponse> response = authService.login(req);

        // Then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo(CommonMessage.LOGIN_SUCCESS);
        assertThat(response.getData()).isNotNull();
        assertThat(response.getData().getToken()).isEqualTo("jwt.token.here");
        assertThat(response.getData().getRole()).isEqualTo("STAFF");
        assertThat(response.getData().getEmail()).isEqualTo("user@example.com");
        assertThat(response.getData().getFullName()).isEqualTo("John Doe");
    }

    @Test
    void login_userNotFound_throwsInvalidCredentials() {
        // Given
        LoginRequest req = new LoginRequest("nobody@example.com", "Password1!");
        when(userMapper.findByEmail("nobody@example.com")).thenReturn(null);

        // When / Then
        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(401);
                    assertThat(err.getCode()).isEqualTo("INVALID_CREDENTIALS");
                    assertThat(err.getMessage()).isEqualTo(CommonMessage.INVALID_CREDENTIALS);
                });
    }

    @Test
    void login_inactiveAccount_throwsAccountNotActive() {
        // Given
        LoginRequest req = new LoginRequest("user@example.com", "Password1!");
        when(userMapper.findByEmail("user@example.com")).thenReturn(inactiveUser());

        // When / Then
        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(403);
                    assertThat(err.getCode()).isEqualTo("ACCOUNT_NOT_ACTIVE");
                    assertThat(err.getMessage()).isEqualTo(CommonMessage.ACCOUNT_NOT_ACTIVE);
                });
    }

    @Test
    void login_wrongPassword_throwsInvalidCredentials() {
        // Given
        LoginRequest req = new LoginRequest("user@example.com", "WrongPassword1!");
        when(userMapper.findByEmail("user@example.com")).thenReturn(activeUser());
        when(passwordEncoder.matches("WrongPassword1!", "$2a$10$hash")).thenReturn(false);

        // When / Then
        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(401);
                    assertThat(err.getCode()).isEqualTo("INVALID_CREDENTIALS");
                });
    }

    @Test
    void login_blankEmail_throwsValidationError() {
        // Given
        LoginRequest req = new LoginRequest("", "Password1!");

        // When / Then
        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(ApiErrorResponse.class)
                .satisfies(ex -> {
                    ApiErrorResponse err = (ApiErrorResponse) ex;
                    assertThat(err.getStatus()).isEqualTo(400);
                    assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                });

        verifyNoInteractions(userMapper);
    }

    // =========================================================
    // forgotPassword()
    // =========================================================

    @Test
    void forgotPassword_existingUser_sendsOtpEmail() throws Exception {
        // Given
        ForgotPasswordRequest req = new ForgotPasswordRequest("user@example.com");
        when(userMapper.findByEmail("user@example.com")).thenReturn(activeUser());
        MimeMessage mimeMsg = mockMimeMessage();
        when(mailSender.createMimeMessage()).thenReturn(mimeMsg);
        doNothing().when(mailSender).send(mimeMsg);

        // When
        ApiResponse<Void> response = authService.forgotPassword(req);

        // Then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo(CommonMessage.OTP_SENT);

        verify(userVerificationMapper).deleteByUserId(1L, "PASSWORD_RESET");
        verify(userVerificationMapper).insertVerification(any(UserVerification.class));
        verify(mailSender).send(mimeMsg);
    }

    @Test
    void forgotPassword_nonExistentUser_returnsSilentSuccess() {
        // Given — user not found, but service must NOT throw (prevent enumeration)
        ForgotPasswordRequest req = new ForgotPasswordRequest("ghost@example.com");
        when(userMapper.findByEmail("ghost@example.com")).thenReturn(null);

        // When
        ApiResponse<Void> response = authService.forgotPassword(req);

        // Then — still returns OTP_SENT to prevent email enumeration
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo(CommonMessage.OTP_SENT);

        verifyNoInteractions(userVerificationMapper);
        verifyNoInteractions(mailSender);
    }

    // =========================================================
    // resetPassword()
    // =========================================================

    @Test
    void resetPassword_validOtp_updatesPasswordAndDeletesVerification() {
        // Given
        ResetPasswordRequest req = new ResetPasswordRequest(
                "user@example.com", "123456", "NewPassword1!", "NewPassword1!");
        when(userMapper.findByEmail("user@example.com")).thenReturn(activeUser());
        when(userVerificationMapper.findByUserIdAndType(1L, "PASSWORD_RESET"))
                .thenReturn(validVerification("PASSWORD_RESET"));
        when(passwordEncoder.encode("NewPassword1!")).thenReturn("$2a$10$newhash");

        // When
        ApiResponse<Void> response = authService.resetPassword(req);

        // Then
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo(CommonMessage.PASSWORD_RESET_SUCCESS);

        verify(userMapper).updatePassword(1L, "$2a$10$newhash");
        verify(userVerificationMapper).deleteByUserId(1L, "PASSWORD_RESET");
    }

    @Test
    void resetPassword_expiredOtp_throwsOtpExpired() {
        // Given
        ResetPasswordRequest req = new ResetPasswordRequest(
                "user@example.com", "123456", "NewPassword1!", "NewPassword1!");
        when(userMapper.findByEmail("user@example.com")).thenReturn(activeUser());
        when(userVerificationMapper.findByUserIdAndType(1L, "PASSWORD_RESET"))
                .thenReturn(expiredVerification("PASSWORD_RESET"));

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.resetPassword(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("OTP_EXPIRED");
                        assertThat(err.getMessage()).isEqualTo(CommonMessage.OTP_EXPIRED);
                    });
        }

        verify(userMapper, never()).updatePassword(anyLong(), anyString());
    }

    @Test
    void resetPassword_wrongCode_throwsInvalidOtp() {
        // Given — stored OTP is "123456", request sends "999999"
        ResetPasswordRequest req = new ResetPasswordRequest(
                "user@example.com", "999999", "NewPassword1!", "NewPassword1!");
        when(userMapper.findByEmail("user@example.com")).thenReturn(activeUser());
        when(userVerificationMapper.findByUserIdAndType(1L, "PASSWORD_RESET"))
                .thenReturn(validVerification("PASSWORD_RESET"));

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.resetPassword(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("INVALID_OTP");
                    });
        }
    }

    @Test
    void resetPassword_passwordMismatch_throwsValidationError() {
        // Given
        ResetPasswordRequest req = new ResetPasswordRequest(
                "user@example.com", "123456", "NewPassword1!", "DifferentPassword2!");

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.resetPassword(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                        assertThat(err.getMessage()).contains("does not match");
                    });
        }

        verifyNoInteractions(userMapper);
        verifyNoInteractions(userVerificationMapper);
    }

    @Test
    void resetPassword_passwordTooShort_throwsValidationError() {
        // Given — newPassword only 5 chars
        ResetPasswordRequest req = new ResetPasswordRequest(
                "user@example.com", "123456", "Short", "Short");

        // When / Then
        try (MockedStatic<TransactionInterceptor> tx = mockTransactionInterceptor()) {
            assertThatThrownBy(() -> authService.resetPassword(req))
                    .isInstanceOf(ApiErrorResponse.class)
                    .satisfies(ex -> {
                        ApiErrorResponse err = (ApiErrorResponse) ex;
                        assertThat(err.getStatus()).isEqualTo(400);
                        assertThat(err.getCode()).isEqualTo("VALIDATION_ERROR");
                        assertThat(err.getMessage()).contains("8 characters");
                    });
        }

        verifyNoInteractions(userMapper);
        verifyNoInteractions(userVerificationMapper);
    }
}

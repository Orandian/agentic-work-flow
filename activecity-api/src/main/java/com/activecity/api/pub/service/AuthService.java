package com.activecity.api.pub.service;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import com.activecity.api.cm.CommonMessage;
import com.activecity.api.cm.CommonValidator;
import com.activecity.api.cm.entity.User;
import com.activecity.api.cm.entity.UserVerification;
import com.activecity.api.cm.enums.UserRole;
import com.activecity.api.config.UserAuthProvider;
import com.activecity.api.pub.dto.*;
import com.activecity.api.pub.repository.UserMapper;
import com.activecity.api.pub.repository.UserVerificationMapper;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionInterceptor;

import java.security.SecureRandom;
import java.time.OffsetDateTime;

/**
 * Business logic for all authentication flows.
 *
 * <p>Rules enforced here:
 * <ul>
 *   <li>All input validation via {@link CommonValidator} static methods — never {@code @Valid}</li>
 *   <li>All error/message text from {@link CommonMessage} constants</li>
 *   <li>{@code @Transactional(rollbackFor = Exception.class)} on all write methods</li>
 *   <li>Known errors thrown as {@link ApiErrorResponse}; {@code Exception} caught last</li>
 * </ul>
 * </p>
 */
@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private static final String TYPE_REGISTRATION    = "REGISTRATION";
    private static final String TYPE_PASSWORD_RESET  = "PASSWORD_RESET";
    private static final int    OTP_EXPIRY_MINUTES   = 15;

    private final UserMapper               userMapper;
    private final UserVerificationMapper   userVerificationMapper;
    private final PasswordEncoder          passwordEncoder;
    private final UserAuthProvider         userAuthProvider;
    private final JavaMailSender           mailSender;

    @Value("${spring.mail.username}")
    private String fromAddress;

    public AuthService(UserMapper userMapper,
                       UserVerificationMapper userVerificationMapper,
                       PasswordEncoder passwordEncoder,
                       UserAuthProvider userAuthProvider,
                       JavaMailSender mailSender) {
        this.userMapper             = userMapper;
        this.userVerificationMapper = userVerificationMapper;
        this.passwordEncoder        = passwordEncoder;
        this.userAuthProvider       = userAuthProvider;
        this.mailSender             = mailSender;
    }

    // =========================================================
    // register
    // =========================================================

    /**
     * Registers a new (inactive) user and sends a 6-digit OTP to their email.
     *
     * @param req registration payload
     * @return success response carrying {@link CommonMessage#OTP_SENT}
     */
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Void> register(RegisterRequest req) {
        try {
            // 1. Validate input
            CommonValidator.requireNonBlank(req.getFullName(), "Full name");
            CommonValidator.requireValidEmail(req.getEmail());
            CommonValidator.requireMinLength(req.getPassword(), "Password", 8);
            CommonValidator.requireNonBlank(req.getConfirmPassword(), "Confirm password");
            CommonValidator.requireMatch(req.getPassword(), req.getConfirmPassword(), "Confirm password");

            // 2. Uniqueness check
            User existing = userMapper.findByEmail(req.getEmail().trim().toLowerCase());
            if (existing != null) {
                throw new ApiErrorResponse(409, "EMAIL_EXISTS", CommonMessage.EMAIL_ALREADY_EXISTS);
            }

            // 3. Hash password
            String hash = passwordEncoder.encode(req.getPassword());

            // 4. Persist user (inactive)
            User user = User.builder()
                    .email(req.getEmail().trim().toLowerCase())
                    .passwordHash(hash)
                    .fullName(req.getFullName().trim())
                    .role(UserRole.STAFF)
                    .isActive(false)
                    .build();
            userMapper.insertUser(user);

            // 5. Generate OTP and persist verification row
            String otp = generateOtp();
            UserVerification uv = UserVerification.builder()
                    .userId(user.getId())
                    .otpCode(otp)
                    .type(TYPE_REGISTRATION)
                    .expiresAt(OffsetDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                    .build();
            userVerificationMapper.insertVerification(uv);

            // 6. Send OTP email
            sendOtpEmail(user.getEmail(), otp, "Account Verification");

            // 7. Return
            return ApiResponse.ok(CommonMessage.OTP_SENT);

        } catch (ApiErrorResponse e) {
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw e;
        } catch (Exception e) {
            logger.error("register error", e);
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw new ApiErrorResponse(500, "INTERNAL_ERROR", CommonMessage.INTERNAL_SERVER_ERROR);
        }
    }

    // =========================================================
    // verifyOtp
    // =========================================================

    /**
     * Verifies the registration OTP and activates the user account.
     *
     * @param req OTP verification payload
     * @return success response carrying {@link CommonMessage#REGISTRATION_SUCCESS}
     */
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Void> verifyOtp(VerifyOtpRequest req) {
        try {
            // 1. Validate fields
            CommonValidator.requireValidEmail(req.getEmail());
            CommonValidator.requireNonBlank(req.getOtpCode(), "OTP code");

            // 2. Find user
            User user = findUserByEmailOrThrow(req.getEmail());

            // 3. Check account not already active
            if (Boolean.TRUE.equals(user.getIsActive())) {
                throw new ApiErrorResponse(409, "ALREADY_ACTIVE", CommonMessage.ACCOUNT_ALREADY_ACTIVE);
            }

            // 4. Fetch latest REGISTRATION verification
            UserVerification uv = userVerificationMapper.findByUserIdAndType(
                    user.getId(), TYPE_REGISTRATION);
            if (uv == null) {
                throw new ApiErrorResponse(400, "INVALID_OTP", CommonMessage.INVALID_OTP);
            }

            // 5. Check expiry
            if (OffsetDateTime.now().isAfter(uv.getExpiresAt())) {
                throw new ApiErrorResponse(400, "OTP_EXPIRED", CommonMessage.OTP_EXPIRED);
            }

            // 6. Check code match
            if (!uv.getOtpCode().equals(req.getOtpCode())) {
                throw new ApiErrorResponse(400, "INVALID_OTP", CommonMessage.INVALID_OTP);
            }

            // 7. Activate user
            userMapper.updateIsActive(user.getId(), true);

            // 8. Delete verification row
            userVerificationMapper.deleteByUserId(user.getId(), TYPE_REGISTRATION);

            return ApiResponse.ok(CommonMessage.REGISTRATION_SUCCESS);

        } catch (ApiErrorResponse e) {
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw e;
        } catch (Exception e) {
            logger.error("verifyOtp error", e);
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw new ApiErrorResponse(500, "INTERNAL_ERROR", CommonMessage.INTERNAL_SERVER_ERROR);
        }
    }

    // =========================================================
    // login
    // =========================================================

    /**
     * Authenticates a user and issues a JWT on success.
     *
     * @param req login payload
     * @return success response carrying an {@link AuthResponse} with the JWT
     */
    public ApiResponse<AuthResponse> login(LoginRequest req) {
        try {
            // 1. Validate fields
            CommonValidator.requireValidEmail(req.getEmail());
            CommonValidator.requireNonBlank(req.getPassword(), "Password");

            // 2. Find user — return INVALID_CREDENTIALS to prevent email enumeration
            User user = userMapper.findByEmail(req.getEmail().trim().toLowerCase());
            if (user == null) {
                throw new ApiErrorResponse(401, "INVALID_CREDENTIALS", CommonMessage.INVALID_CREDENTIALS);
            }

            // 3. Check account is active
            if (!Boolean.TRUE.equals(user.getIsActive())) {
                throw new ApiErrorResponse(403, "ACCOUNT_NOT_ACTIVE", CommonMessage.ACCOUNT_NOT_ACTIVE);
            }

            // 4. Verify password
            if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
                throw new ApiErrorResponse(401, "INVALID_CREDENTIALS", CommonMessage.INVALID_CREDENTIALS);
            }

            // 5. Issue JWT
            String token = userAuthProvider.createToken(user);

            AuthResponse authResponse = new AuthResponse(
                    token,
                    user.getRole().name(),
                    user.getFullName(),
                    user.getEmail()
            );

            return ApiResponse.ok(CommonMessage.LOGIN_SUCCESS, authResponse);

        } catch (ApiErrorResponse e) {
            throw e;
        } catch (Exception e) {
            logger.error("login error", e);
            throw new ApiErrorResponse(500, "INTERNAL_ERROR", CommonMessage.INTERNAL_SERVER_ERROR);
        }
    }

    // =========================================================
    // forgotPassword
    // =========================================================

    /**
     * Sends a password-reset OTP to the user's email.
     *
     * <p>Returns a success response even when the email is not found to
     * prevent user enumeration attacks.</p>
     *
     * @param req forgot-password payload
     * @return success response carrying {@link CommonMessage#OTP_SENT}
     */
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Void> forgotPassword(ForgotPasswordRequest req) {
        try {
            // 1. Validate email
            CommonValidator.requireValidEmail(req.getEmail());

            // 2. Find user — silently succeed if not found
            User user = userMapper.findByEmail(req.getEmail().trim().toLowerCase());
            if (user == null) {
                return ApiResponse.ok(CommonMessage.OTP_SENT);
            }

            // 3. Delete any existing PASSWORD_RESET verification
            userVerificationMapper.deleteByUserId(user.getId(), TYPE_PASSWORD_RESET);

            // 4. Generate and persist new OTP
            String otp = generateOtp();
            UserVerification uv = UserVerification.builder()
                    .userId(user.getId())
                    .otpCode(otp)
                    .type(TYPE_PASSWORD_RESET)
                    .expiresAt(OffsetDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                    .build();
            userVerificationMapper.insertVerification(uv);

            // 5. Send reset email
            sendOtpEmail(user.getEmail(), otp, "Password Reset");

            return ApiResponse.ok(CommonMessage.OTP_SENT);

        } catch (ApiErrorResponse e) {
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw e;
        } catch (Exception e) {
            logger.error("forgotPassword error", e);
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw new ApiErrorResponse(500, "INTERNAL_ERROR", CommonMessage.INTERNAL_SERVER_ERROR);
        }
    }

    // =========================================================
    // resetPassword
    // =========================================================

    /**
     * Resets a user's password after successful OTP verification.
     *
     * @param req reset-password payload
     * @return success response carrying {@link CommonMessage#PASSWORD_RESET_SUCCESS}
     */
    @Transactional(rollbackFor = Exception.class)
    public ApiResponse<Void> resetPassword(ResetPasswordRequest req) {
        try {
            // 1. Validate all fields
            CommonValidator.requireValidEmail(req.getEmail());
            CommonValidator.requireNonBlank(req.getOtpCode(), "OTP code");
            CommonValidator.requireMinLength(req.getNewPassword(), "New password", 8);
            CommonValidator.requireNonBlank(req.getConfirmPassword(), "Confirm password");
            CommonValidator.requireMatch(req.getNewPassword(), req.getConfirmPassword(), "Confirm password");

            // 2. Find user
            User user = findUserByEmailOrThrow(req.getEmail());

            // 3. Fetch PASSWORD_RESET verification
            UserVerification uv = userVerificationMapper.findByUserIdAndType(
                    user.getId(), TYPE_PASSWORD_RESET);
            if (uv == null) {
                throw new ApiErrorResponse(400, "INVALID_OTP", CommonMessage.INVALID_OTP);
            }

            // 4. Check expiry
            if (OffsetDateTime.now().isAfter(uv.getExpiresAt())) {
                throw new ApiErrorResponse(400, "OTP_EXPIRED", CommonMessage.OTP_EXPIRED);
            }

            // 5. Check code match
            if (!uv.getOtpCode().equals(req.getOtpCode())) {
                throw new ApiErrorResponse(400, "INVALID_OTP", CommonMessage.INVALID_OTP);
            }

            // 6. Update password
            String newHash = passwordEncoder.encode(req.getNewPassword());
            userMapper.updatePassword(user.getId(), newHash);

            // 7. Delete verification row
            userVerificationMapper.deleteByUserId(user.getId(), TYPE_PASSWORD_RESET);

            return ApiResponse.ok(CommonMessage.PASSWORD_RESET_SUCCESS);

        } catch (ApiErrorResponse e) {
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw e;
        } catch (Exception e) {
            logger.error("resetPassword error", e);
            TransactionInterceptor.currentTransactionStatus().setRollbackOnly();
            throw new ApiErrorResponse(500, "INTERNAL_ERROR", CommonMessage.INTERNAL_SERVER_ERROR);
        }
    }

    // =========================================================
    // Private helpers
    // =========================================================

    private User findUserByEmailOrThrow(String email) {
        User user = userMapper.findByEmail(email.trim().toLowerCase());
        if (user == null) {
            throw new ApiErrorResponse(404, "USER_NOT_FOUND", CommonMessage.USER_NOT_FOUND);
        }
        return user;
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private void sendOtpEmail(String to, String otp, String subject) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject("ActiveCity — " + subject + " Code");
            helper.setText(buildEmailHtml(otp, subject), true);
            mailSender.send(message);
        } catch (Exception e) {
            logger.error("Failed to send OTP email to {}", to, e);
            throw new ApiErrorResponse(500, "MAIL_ERROR",
                    "Failed to send verification email. Please try again.");
        }
    }

    private String buildEmailHtml(String otp, String context) {
        return """
                <!DOCTYPE html>
                <html>
                <body style="font-family:sans-serif;color:#1a1a1a;max-width:480px;margin:0 auto;padding:32px 24px;">
                  <h2 style="margin-top:0;">ActiveCity Staff Portal</h2>
                  <p>Your <strong>%s</strong> code is:</p>
                  <div style="font-size:32px;font-weight:700;letter-spacing:8px;
                              background:#f4f4f5;border-radius:8px;padding:16px 24px;
                              display:inline-block;margin:16px 0;">%s</div>
                  <p style="color:#6b7280;font-size:13px;">
                    This code expires in %d minutes.<br>
                    If you did not request this, you can safely ignore this email.
                  </p>
                </body>
                </html>
                """.formatted(context, otp, OTP_EXPIRY_MINUTES);
    }
}

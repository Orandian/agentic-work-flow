package com.activecity.api.cm;

/**
 * All user-facing message strings used across services and validators.
 * Never inline these strings — always reference a constant here.
 */
public final class CommonMessage {

    private CommonMessage() {}

    // --- Registration ---
    public static final String EMAIL_ALREADY_EXISTS  = "An account with this email already exists.";
    public static final String REGISTRATION_SUCCESS  = "Account verified successfully. You can now log in.";
    public static final String OTP_SENT              = "A verification code has been sent to your email.";

    // --- Account state ---
    public static final String USER_NOT_FOUND        = "No account found with the provided email.";
    public static final String ACCOUNT_ALREADY_ACTIVE = "This account is already active.";
    public static final String ACCOUNT_NOT_ACTIVE    = "Your account is not yet verified. Please check your email for the OTP.";

    // --- OTP ---
    public static final String INVALID_OTP           = "The verification code is invalid.";
    public static final String OTP_EXPIRED           = "The verification code has expired. Please request a new one.";

    // --- Login ---
    public static final String INVALID_CREDENTIALS   = "Invalid email or password.";
    public static final String LOGIN_SUCCESS         = "Login successful.";

    // --- Password reset ---
    public static final String PASSWORD_RESET_SUCCESS = "Your password has been reset successfully.";

    // --- Generic ---
    public static final String INTERNAL_SERVER_ERROR = "An unexpected error occurred. Please try again later.";

    // --- Staff management ---
    public static final String STAFF_NOT_FOUND       = "No staff member found with the provided ID.";
    public static final String STAFF_CREATED         = "Staff member created successfully.";
    public static final String STAFF_UPDATED         = "Staff member updated successfully.";
    public static final String STAFF_DELETED         = "Staff member deleted successfully.";

    // --- Task management ---
    public static final String TASK_NOT_FOUND        = "No task found with the provided ID.";
    public static final String TASK_CREATED          = "Task created successfully.";
    public static final String TASK_UPDATED          = "Task updated successfully.";
    public static final String TASK_DELETED          = "Task deleted successfully.";

    // --- Notice management ---
    public static final String NOTICE_NOT_FOUND      = "No notice found with the provided ID.";
    public static final String NOTICE_CREATED        = "Notice created successfully.";
    public static final String NOTICE_UPDATED        = "Notice updated successfully.";
    public static final String NOTICE_DELETED        = "Notice deleted successfully.";
    public static final String NOTICE_PUBLISHED      = "Notice published successfully.";

    // --- User profile ---
    public static final String PROFILE_UPDATED       = "Profile updated successfully.";
    public static final String PASSWORD_CHANGED      = "Password changed successfully.";
    public static final String WRONG_CURRENT_PASSWORD = "Current password is incorrect.";
}

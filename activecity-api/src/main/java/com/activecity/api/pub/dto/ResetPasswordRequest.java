package com.activecity.api.pub.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResetPasswordRequest {

    private String email;
    private String otpCode;
    private String newPassword;
    private String confirmPassword;
}

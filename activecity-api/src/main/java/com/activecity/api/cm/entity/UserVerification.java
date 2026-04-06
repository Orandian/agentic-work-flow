package com.activecity.api.cm.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVerification {

    private Long id;
    private Long userId;
    private String otpCode;
    private String type;          // "REGISTRATION" | "PASSWORD_RESET"
    private OffsetDateTime expiresAt;
    private OffsetDateTime createdAt;
}

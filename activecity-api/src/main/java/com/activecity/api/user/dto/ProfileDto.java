package com.activecity.api.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileDto {
    private Long   id;
    private String name;
    private String email;
    private String department;
    private String position;
    private String userType;
    private String createdAt;
}

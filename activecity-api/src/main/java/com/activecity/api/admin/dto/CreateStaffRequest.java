package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStaffRequest {
    private String name;
    private String email;
    private String department;
    private String position;
    private String password;
    private String userType;   // "STAFF" | "ADMIN"
}

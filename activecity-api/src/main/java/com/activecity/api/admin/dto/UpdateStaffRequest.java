package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStaffRequest {
    private String name;
    private String department;
    private String position;
    private String password;   // optional — null means no change
    private String userType;
}

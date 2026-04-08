package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffDto {
    private Long   id;
    private String name;
    private String email;
    private String department;
    private String position;
    private String userType;       // "ADMIN" | "STAFF"
    private int    status;         // 1=active, 2=locked
    private String latestLoginAt;
    private String createdAt;
}

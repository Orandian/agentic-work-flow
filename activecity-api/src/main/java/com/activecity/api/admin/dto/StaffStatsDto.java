package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffStatsDto {
    private int                 total;
    private int                 active;
    private int                 locked;
    private int                 newThisMonth;
    private Map<String, Integer> byDepartment;
}

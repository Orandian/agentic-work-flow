package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDto {
    private int totalStaff;
    private int newStaffThisMonth;
    private int activeTasks;
    private int tasksDueToday;
    private int totalDocuments;
    private int newDocumentsThisWeek;
    private int pendingNotices;
    private int urgentNotices;
}

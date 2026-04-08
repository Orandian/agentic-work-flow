package com.activecity.api.admin.service;

import com.activecity.api.admin.dto.ActivityDto;
import com.activecity.api.admin.dto.DashboardStatsDto;
import com.activecity.api.admin.repository.DashboardMapper;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DashboardService {

    private final DashboardMapper dashboardMapper;

    public DashboardService(DashboardMapper dashboardMapper) {
        this.dashboardMapper = dashboardMapper;
    }

    public DashboardStatsDto getStats() {
        return DashboardStatsDto.builder()
                .totalStaff(dashboardMapper.countTotalStaff())
                .newStaffThisMonth(dashboardMapper.countNewStaffThisMonth())
                .activeTasks(dashboardMapper.countActiveTasks())
                .tasksDueToday(dashboardMapper.countTasksDueToday())
                .totalDocuments(dashboardMapper.countTotalDocuments())
                .newDocumentsThisWeek(dashboardMapper.countNewDocumentsThisWeek())
                .pendingNotices(dashboardMapper.countPendingNotices())
                .urgentNotices(dashboardMapper.countUrgentNotices())
                .build();
    }

    public List<ActivityDto> getActivity() {
        // Activity feed will be implemented with a dedicated audit log table in a later phase.
        return List.of();
    }
}

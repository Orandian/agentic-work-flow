package com.activecity.api.admin.repository;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DashboardMapper {
    int countTotalStaff();
    int countNewStaffThisMonth();
    int countActiveTasks();
    int countTasksDueToday();
    int countTotalDocuments();
    int countNewDocumentsThisWeek();
    int countPendingNotices();
    int countUrgentNotices();
}

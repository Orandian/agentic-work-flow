package com.activecity.api.admin.repository;

import com.activecity.api.admin.dto.TaskDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TaskMapper {
    List<TaskDto> findAll(@Param("status") String status,
                          @Param("search") String search,
                          @Param("priority") String priority,
                          @Param("offset") int offset,
                          @Param("limit") int limit);

    int countAll(@Param("status") String status,
                 @Param("search") String search,
                 @Param("priority") String priority);

    TaskDto findById(@Param("id") int id);

    int countActive();
    int countDueToday();
    int countCompletedThisWeek();

    void insert(@Param("title") String title,
                @Param("description") String description,
                @Param("category") String category,
                @Param("priority") String priority,
                @Param("status") String status,
                @Param("assignedTo") Long assignedTo,
                @Param("dueDate") String dueDate,
                @Param("createdBy") Long createdBy);

    Long lastInsertId();

    void update(@Param("id") int id,
                @Param("title") String title,
                @Param("description") String description,
                @Param("category") String category,
                @Param("priority") String priority,
                @Param("status") String status,
                @Param("assignedTo") Long assignedTo,
                @Param("dueDate") String dueDate);

    void updateStatus(@Param("id") int id, @Param("status") String status);

    void softDelete(@Param("id") int id);
}

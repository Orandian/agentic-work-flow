package com.activecity.api.admin.service;

import com.activecity.api.admin.dto.*;
import com.activecity.api.admin.repository.TaskMapper;
import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.CommonMessage;
import com.activecity.api.cm.CommonValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TaskService {

    private final TaskMapper taskMapper;

    public TaskService(TaskMapper taskMapper) {
        this.taskMapper = taskMapper;
    }

    public PaginatedResponse<TaskDto> list(String status, String search, String priority,
                                           int page, int pageSize) {
        int offset = (page - 1) * pageSize;
        List<TaskDto> items = taskMapper.findAll(status, search, priority, offset, pageSize);
        int total = taskMapper.countAll(status, search, priority);
        int totalPages = (int) Math.ceil((double) total / pageSize);
        return PaginatedResponse.<TaskDto>builder()
                .items(items).total(total).page(page).pageSize(pageSize).totalPages(totalPages)
                .build();
    }

    public TaskStatsDto stats() {
        return TaskStatsDto.builder()
                .active(taskMapper.countActive())
                .dueToday(taskMapper.countDueToday())
                .completedThisWeek(taskMapper.countCompletedThisWeek())
                .build();
    }

    public TaskDto getById(int id) {
        TaskDto dto = taskMapper.findById(id);
        if (dto == null) throw new ApiErrorResponse(404, "NOT_FOUND", CommonMessage.TASK_NOT_FOUND);
        return dto;
    }

    @Transactional(rollbackFor = Exception.class)
    public TaskDto create(SaveTaskRequest req, Long createdBy) {
        CommonValidator.requireNonBlank(req.getTitle(),    "title");
        CommonValidator.requireNonBlank(req.getCategory(), "category");
        CommonValidator.requireNonBlank(req.getPriority(), "priority");
        taskMapper.insert(req.getTitle(), req.getDescription(), req.getCategory(),
                req.getPriority(), req.getStatus(), req.getAssignedTo(),
                req.getDueDate(), createdBy);
        Long id = taskMapper.lastInsertId();
        return taskMapper.findById(id.intValue());
    }

    @Transactional(rollbackFor = Exception.class)
    public TaskDto update(int id, SaveTaskRequest req) {
        getById(id);
        CommonValidator.requireNonBlank(req.getTitle(),    "title");
        CommonValidator.requireNonBlank(req.getCategory(), "category");
        CommonValidator.requireNonBlank(req.getPriority(), "priority");
        CommonValidator.requireNonBlank(req.getStatus(),   "status");
        taskMapper.update(id, req.getTitle(), req.getDescription(), req.getCategory(),
                req.getPriority(), req.getStatus(), req.getAssignedTo(), req.getDueDate());
        return taskMapper.findById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public TaskDto updateStatus(int id, String status) {
        getById(id);
        CommonValidator.requireNonBlank(status, "status");
        taskMapper.updateStatus(id, status);
        return taskMapper.findById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(int id) {
        getById(id);
        taskMapper.softDelete(id);
    }
}

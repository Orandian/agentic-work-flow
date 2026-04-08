package com.activecity.api.admin.controller;

import com.activecity.api.admin.dto.SaveTaskRequest;
import com.activecity.api.admin.service.TaskService;
import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<Object> list(
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String priority,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.list(status, search, priority, page, pageSize)));
    }

    @GetMapping("/stats")
    public ResponseEntity<Object> stats() {
        return ResponseEntity.ok(ApiResponse.ok(taskService.stats()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable int id) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody SaveTaskRequest req) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(taskService.create(req, userId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable int id, @RequestBody SaveTaskRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.update(id, req)));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Object> updateStatus(@PathVariable int id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(taskService.updateStatus(id, body.get("status"))));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable int id) {
        taskService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Task deleted"));
    }

    @ExceptionHandler(ApiErrorResponse.class)
    public ResponseEntity<Object> handleApiError(ApiErrorResponse ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put("status", ex.getStatus());
        body.put("code", ex.getCode());
        body.put("message", ex.getMessage());
        return ResponseEntity.status(ex.getStatus()).body(body);
    }
}

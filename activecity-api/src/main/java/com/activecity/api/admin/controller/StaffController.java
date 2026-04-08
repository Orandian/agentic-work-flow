package com.activecity.api.admin.controller;

import com.activecity.api.admin.dto.CreateStaffRequest;
import com.activecity.api.admin.dto.UpdateStaffRequest;
import com.activecity.api.admin.service.StaffService;
import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public ResponseEntity<Object> list(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "") String department,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.list(search, department, page, pageSize)));
    }

    @GetMapping("/stats")
    public ResponseEntity<Object> stats() {
        return ResponseEntity.ok(ApiResponse.ok(staffService.stats()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody CreateStaffRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.create(req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable Long id, @RequestBody UpdateStaffRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.update(id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable Long id) {
        staffService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Staff member deleted"));
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

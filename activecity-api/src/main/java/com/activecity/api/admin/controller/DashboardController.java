package com.activecity.api.admin.controller;

import com.activecity.api.admin.service.DashboardService;
import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public ResponseEntity<Object> stats() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getStats()));
    }

    @GetMapping("/activity")
    public ResponseEntity<Object> activity() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getActivity()));
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

package com.activecity.api.admin.controller;

import com.activecity.api.admin.dto.SaveNoticeRequest;
import com.activecity.api.admin.service.NoticeService;
import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin/notices")
public class NoticeController {

    private final NoticeService noticeService;

    public NoticeController(NoticeService noticeService) {
        this.noticeService = noticeService;
    }

    @GetMapping
    public ResponseEntity<Object> list(
            @RequestParam(defaultValue = "") String type,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.list(type, status, page, pageSize)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getById(@PathVariable int id) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<Object> create(@RequestBody SaveNoticeRequest req) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(noticeService.create(req, userId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> update(@PathVariable int id, @RequestBody SaveNoticeRequest req) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.update(id, req)));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<Object> publish(@PathVariable int id) {
        return ResponseEntity.ok(ApiResponse.ok(noticeService.publish(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> delete(@PathVariable int id) {
        noticeService.delete(id);
        return ResponseEntity.ok(ApiResponse.ok("Notice deleted"));
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

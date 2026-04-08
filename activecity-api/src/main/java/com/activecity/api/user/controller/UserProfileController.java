package com.activecity.api.user.controller;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.ApiResponse;
import com.activecity.api.user.dto.ChangePasswordRequest;
import com.activecity.api.user.dto.UpdateProfileRequest;
import com.activecity.api.user.service.UserProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/user")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping("/profile")
    public ResponseEntity<Object> getProfile() {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(userProfileService.getProfile(userId)));
    }

    @PutMapping("/profile")
    public ResponseEntity<Object> updateProfile(@RequestBody UpdateProfileRequest req) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(ApiResponse.ok(userProfileService.updateProfile(userId, req)));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Object> changePassword(@RequestBody ChangePasswordRequest req) {
        Long userId = (Long) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        userProfileService.changePassword(userId, req);
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully"));
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

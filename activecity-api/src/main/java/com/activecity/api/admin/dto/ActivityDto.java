package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActivityDto {
    private String userName;
    private String userInitials;
    private String action;
    private String timeAgo;
    private String type;   // "document" | "task" | "staff" | "notice"
}

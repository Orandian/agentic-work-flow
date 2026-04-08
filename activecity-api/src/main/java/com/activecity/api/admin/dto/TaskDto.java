package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskDto {
    private int    id;
    private String title;
    private String description;
    private String category;       // "IT" | "HR" | "FACILITIES" | "FINANCE" | "OTHER"
    private String status;         // "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED"
    private String priority;       // "LOW" | "MEDIUM" | "HIGH"
    private String assignedToName;
    private Long   assignedToId;
    private String dueDate;
    private String createdByName;
    private String createdAt;
    private String updatedAt;
}

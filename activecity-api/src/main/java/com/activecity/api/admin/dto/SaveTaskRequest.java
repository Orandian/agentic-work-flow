package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveTaskRequest {
    private String title;
    private String description;
    private String category;
    private String priority;
    private String status;
    private Long   assignedTo;
    private String dueDate;  // "YYYY-MM-DD"
}

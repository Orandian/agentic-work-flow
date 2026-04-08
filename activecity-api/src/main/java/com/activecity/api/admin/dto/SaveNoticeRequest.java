package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveNoticeRequest {
    private String  title;
    private String  content;
    private String  type;
    private boolean pinned;
    private String  status;  // "DRAFT" | "PUBLISHED"
}

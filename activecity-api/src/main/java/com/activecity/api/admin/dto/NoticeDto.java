package com.activecity.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoticeDto {
    private int     id;
    private String  title;
    private String  content;
    private String  type;          // "GENERAL" | "URGENT" | "HOLIDAY" | "POLICY"
    private String  status;        // "DRAFT" | "PUBLISHED" | "ARCHIVED"
    private boolean pinned;
    private String  postedByName;
    private String  publishedAt;
    private String  createdAt;
}

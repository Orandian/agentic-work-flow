package com.activecity.api.admin.service;

import com.activecity.api.admin.dto.*;
import com.activecity.api.admin.repository.NoticeMapper;
import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.CommonMessage;
import com.activecity.api.cm.CommonValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NoticeService {

    private final NoticeMapper noticeMapper;

    public NoticeService(NoticeMapper noticeMapper) {
        this.noticeMapper = noticeMapper;
    }

    public PaginatedResponse<NoticeDto> list(String type, String status, int page, int pageSize) {
        int offset = (page - 1) * pageSize;
        List<NoticeDto> items = noticeMapper.findAll(type, status, offset, pageSize);
        int total = noticeMapper.countAll(type, status);
        int totalPages = (int) Math.ceil((double) total / pageSize);
        return PaginatedResponse.<NoticeDto>builder()
                .items(items).total(total).page(page).pageSize(pageSize).totalPages(totalPages)
                .build();
    }

    public NoticeDto getById(int id) {
        NoticeDto dto = noticeMapper.findById(id);
        if (dto == null) throw new ApiErrorResponse(404, "NOT_FOUND", CommonMessage.NOTICE_NOT_FOUND);
        return dto;
    }

    @Transactional(rollbackFor = Exception.class)
    public NoticeDto create(SaveNoticeRequest req, Long postedBy) {
        CommonValidator.requireNonBlank(req.getTitle(),   "title");
        CommonValidator.requireNonBlank(req.getContent(), "content");
        CommonValidator.requireNonBlank(req.getType(),    "type");
        String status = req.getStatus() != null ? req.getStatus() : "DRAFT";
        noticeMapper.insert(req.getTitle(), req.getContent(), req.getType(),
                status, req.isPinned(), postedBy);
        Long id = noticeMapper.lastInsertId();
        return noticeMapper.findById(id.intValue());
    }

    @Transactional(rollbackFor = Exception.class)
    public NoticeDto update(int id, SaveNoticeRequest req) {
        getById(id);
        CommonValidator.requireNonBlank(req.getTitle(),   "title");
        CommonValidator.requireNonBlank(req.getContent(), "content");
        CommonValidator.requireNonBlank(req.getType(),    "type");
        String status = req.getStatus() != null ? req.getStatus() : "DRAFT";
        noticeMapper.update(id, req.getTitle(), req.getContent(), req.getType(),
                status, req.isPinned());
        return noticeMapper.findById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public NoticeDto publish(int id) {
        getById(id);
        noticeMapper.publish(id);
        return noticeMapper.findById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(int id) {
        getById(id);
        noticeMapper.softDelete(id);
    }
}

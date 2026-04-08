package com.activecity.api.admin.service;

import com.activecity.api.admin.dto.*;
import com.activecity.api.admin.repository.StaffMapper;
import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.CommonMessage;
import com.activecity.api.cm.CommonValidator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class StaffService {

    private final StaffMapper     staffMapper;
    private final PasswordEncoder passwordEncoder;

    public StaffService(StaffMapper staffMapper, PasswordEncoder passwordEncoder) {
        this.staffMapper     = staffMapper;
        this.passwordEncoder = passwordEncoder;
    }

    public PaginatedResponse<StaffDto> list(String search, String department, int page, int pageSize) {
        int offset = (page - 1) * pageSize;
        List<StaffDto> items = staffMapper.findAll(search, department, offset, pageSize);
        int total = staffMapper.countAll(search, department);
        int totalPages = (int) Math.ceil((double) total / pageSize);
        return PaginatedResponse.<StaffDto>builder()
                .items(items).total(total).page(page).pageSize(pageSize).totalPages(totalPages)
                .build();
    }

    public StaffStatsDto stats() {
        List<Map<String, Object>> deptRows = staffMapper.countByDepartment();
        Map<String, Integer> byDept = new HashMap<>();
        for (Map<String, Object> row : deptRows) {
            byDept.put((String) row.get("department"), ((Number) row.get("cnt")).intValue());
        }
        return StaffStatsDto.builder()
                .total(staffMapper.countTotal())
                .active(staffMapper.countActive())
                .locked(staffMapper.countLocked())
                .newThisMonth(staffMapper.countNewThisMonth())
                .byDepartment(byDept)
                .build();
    }

    public StaffDto getById(Long id) {
        StaffDto dto = staffMapper.findById(id);
        if (dto == null) throw new ApiErrorResponse(404, "NOT_FOUND", CommonMessage.STAFF_NOT_FOUND);
        return dto;
    }

    @Transactional(rollbackFor = Exception.class)
    public StaffDto create(CreateStaffRequest req) {
        CommonValidator.requireNonBlank(req.getName(),       "name");
        CommonValidator.requireNonBlank(req.getEmail(),      "email");
        CommonValidator.requireValidEmail(req.getEmail());
        CommonValidator.requireNonBlank(req.getDepartment(), "department");
        CommonValidator.requireNonBlank(req.getPosition(),   "position");
        CommonValidator.requireNonBlank(req.getPassword(),   "password");
        CommonValidator.requireMinLength(req.getPassword(), "password", 8);
        CommonValidator.requireNonBlank(req.getUserType(),   "userType");

        String hash = passwordEncoder.encode(req.getPassword());
        staffMapper.insert(req.getName(), req.getEmail(), req.getDepartment(),
                req.getPosition(), hash, req.getUserType());
        Long id = staffMapper.lastInsertId();
        return staffMapper.findById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public StaffDto update(Long id, UpdateStaffRequest req) {
        getById(id);
        CommonValidator.requireNonBlank(req.getName(),       "name");
        CommonValidator.requireNonBlank(req.getDepartment(), "department");
        CommonValidator.requireNonBlank(req.getPosition(),   "position");
        CommonValidator.requireNonBlank(req.getUserType(),   "userType");

        String hash = null;
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            CommonValidator.requireMinLength(req.getPassword(), "password", 8);
            hash = passwordEncoder.encode(req.getPassword());
        }
        staffMapper.update(id, req.getName(), req.getDepartment(), req.getPosition(),
                hash, req.getUserType());
        return staffMapper.findById(id);
    }

    @Transactional(rollbackFor = Exception.class)
    public void delete(Long id) {
        getById(id);
        staffMapper.softDelete(id);
    }
}

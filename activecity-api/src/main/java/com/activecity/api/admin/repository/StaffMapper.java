package com.activecity.api.admin.repository;

import com.activecity.api.admin.dto.StaffDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface StaffMapper {
    List<StaffDto> findAll(@Param("search") String search,
                           @Param("department") String department,
                           @Param("offset") int offset,
                           @Param("limit") int limit);

    int countAll(@Param("search") String search, @Param("department") String department);

    StaffDto findById(@Param("id") Long id);

    int countTotal();
    int countActive();
    int countLocked();
    int countNewThisMonth();
    List<Map<String, Object>> countByDepartment();

    void insert(@Param("name") String name,
                @Param("email") String email,
                @Param("department") String department,
                @Param("position") String position,
                @Param("passwordHash") String passwordHash,
                @Param("userType") String userType);

    Long lastInsertId();

    void update(@Param("id") Long id,
                @Param("name") String name,
                @Param("department") String department,
                @Param("position") String position,
                @Param("passwordHash") String passwordHash,
                @Param("userType") String userType);

    void softDelete(@Param("id") Long id);
}

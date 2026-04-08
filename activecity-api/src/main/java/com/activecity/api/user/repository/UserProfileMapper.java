package com.activecity.api.user.repository;

import com.activecity.api.user.dto.ProfileDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserProfileMapper {
    ProfileDto findById(@Param("id") Long id);

    void updateProfile(@Param("id") Long id,
                       @Param("name") String name,
                       @Param("department") String department,
                       @Param("position") String position);
}

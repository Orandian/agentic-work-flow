package com.activecity.api.admin.repository;

import com.activecity.api.admin.dto.NoticeDto;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface NoticeMapper {
    List<NoticeDto> findAll(@Param("type") String type,
                            @Param("status") String status,
                            @Param("offset") int offset,
                            @Param("limit") int limit);

    int countAll(@Param("type") String type, @Param("status") String status);

    NoticeDto findById(@Param("id") int id);

    void insert(@Param("title") String title,
                @Param("content") String content,
                @Param("type") String type,
                @Param("status") String status,
                @Param("pinned") boolean pinned,
                @Param("postedBy") Long postedBy);

    Long lastInsertId();

    void update(@Param("id") int id,
                @Param("title") String title,
                @Param("content") String content,
                @Param("type") String type,
                @Param("status") String status,
                @Param("pinned") boolean pinned);

    void publish(@Param("id") int id);

    void softDelete(@Param("id") int id);
}

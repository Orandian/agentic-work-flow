package com.activecity.api.pub.repository;

import com.activecity.api.cm.entity.UserVerification;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * MyBatis mapper for the {@code user_verifications} table.
 * SQL is defined in {@code resources/mapper/pub/UserVerificationMapper.xml}.
 */
@Mapper
public interface UserVerificationMapper {

    /**
     * Inserts a new OTP verification row.
     * The generated primary key is written back to {@code uv.id}.
     *
     * @param uv the verification entity to persist
     */
    void insertVerification(UserVerification uv);

    /**
     * Returns the most-recently created verification record for the given
     * user and type (e.g. "REGISTRATION" or "PASSWORD_RESET").
     *
     * @param userId the owning user's primary key
     * @param type   the verification type string
     * @return the latest {@link UserVerification} or {@code null} if none exists
     */
    UserVerification findByUserIdAndType(@Param("userId") Long userId,
                                        @Param("type") String type);

    /**
     * Hard-deletes all verification rows for a user and type.
     * Called after a successful OTP verification to prevent reuse.
     *
     * @param userId the owning user's primary key
     * @param type   the verification type string
     */
    void deleteByUserId(@Param("userId") Long userId, @Param("type") String type);

    /**
     * Housekeeping method that deletes all rows whose {@code expires_at} is in the past.
     * Intended to be called by a scheduled job.
     */
    void deleteExpired();
}

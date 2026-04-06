package com.activecity.api.pub.repository;

import com.activecity.api.cm.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * MyBatis mapper for the {@code users} table.
 * SQL is defined in {@code resources/mapper/pub/UserMapper.xml}.
 */
@Mapper
public interface UserMapper {

    /**
     * Inserts a new user row.
     * The generated primary key is written back to {@code user.id}.
     *
     * @param user the user entity to persist
     */
    void insertUser(User user);

    /**
     * Looks up a user by email address.
     *
     * @param email the email to search for
     * @return the matching {@link User} or {@code null} if not found
     */
    User findByEmail(@Param("email") String email);

    /**
     * Looks up a user by primary key.
     *
     * @param id the user's primary key
     * @return the matching {@link User} or {@code null} if not found
     */
    User findById(@Param("id") Long id);

    /**
     * Toggles the {@code is_active} flag for a user.
     *
     * @param userId   the user's primary key
     * @param isActive the new active state
     */
    void updateIsActive(@Param("userId") Long userId, @Param("isActive") boolean isActive);

    /**
     * Replaces the stored BCrypt hash with a new one.
     *
     * @param userId       the user's primary key
     * @param passwordHash the new BCrypt-encoded password
     */
    void updatePassword(@Param("userId") Long userId, @Param("passwordHash") String passwordHash);
}

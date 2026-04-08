package com.activecity.api.user.service;

import com.activecity.api.cm.ApiErrorResponse;
import com.activecity.api.cm.CommonMessage;
import com.activecity.api.cm.CommonValidator;
import com.activecity.api.pub.repository.UserMapper;
import com.activecity.api.user.dto.ChangePasswordRequest;
import com.activecity.api.user.dto.ProfileDto;
import com.activecity.api.user.dto.UpdateProfileRequest;
import com.activecity.api.user.repository.UserProfileMapper;
import com.activecity.api.cm.entity.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserProfileMapper userProfileMapper;
    private final UserMapper        userMapper;
    private final PasswordEncoder   passwordEncoder;

    public UserProfileService(UserProfileMapper userProfileMapper,
                               UserMapper userMapper,
                               PasswordEncoder passwordEncoder) {
        this.userProfileMapper = userProfileMapper;
        this.userMapper        = userMapper;
        this.passwordEncoder   = passwordEncoder;
    }

    public ProfileDto getProfile(Long userId) {
        ProfileDto dto = userProfileMapper.findById(userId);
        if (dto == null) throw new ApiErrorResponse(404, "NOT_FOUND", CommonMessage.USER_NOT_FOUND);
        return dto;
    }

    @Transactional(rollbackFor = Exception.class)
    public ProfileDto updateProfile(Long userId, UpdateProfileRequest req) {
        CommonValidator.requireNonBlank(req.getName(), "name");
        userProfileMapper.updateProfile(userId, req.getName(), req.getDepartment(), req.getPosition());
        return userProfileMapper.findById(userId);
    }

    @Transactional(rollbackFor = Exception.class)
    public void changePassword(Long userId, ChangePasswordRequest req) {
        CommonValidator.requireNonBlank(req.getCurrentPassword(), "currentPassword");
        CommonValidator.requireNonBlank(req.getNewPassword(),     "newPassword");
        CommonValidator.requireMinLength(req.getNewPassword(), "newPassword", 8);

        User user = userMapper.findById(userId);
        if (user == null) throw new ApiErrorResponse(404, "NOT_FOUND", CommonMessage.USER_NOT_FOUND);

        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
            throw new ApiErrorResponse(400, "WRONG_PASSWORD", CommonMessage.WRONG_CURRENT_PASSWORD);
        }
        userMapper.updatePassword(userId, passwordEncoder.encode(req.getNewPassword()));
    }
}

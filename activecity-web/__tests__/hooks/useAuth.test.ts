import { renderHook, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import axios from "axios";
import {
  useLogin,
  useRegister,
  useVerifyOtp,
  useForgotPassword,
  useResetPassword,
} from "@/hooks/useAuth";
import { Providers } from "../utils/renderWithProviders";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios, true);

describe("useAuth hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("useLogin", () => {
    it("calls POST /api/auth/login and stores token in localStorage on success", async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: "Login successful",
          data: {
            token: "jwt-token-123",
            role: "STAFF",
            fullName: "Jane Smith",
            email: "jane@activecity.gov",
          },
        },
      };
      mockedAxios.post = vi.fn().mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useLogin(), { wrapper: Providers });

      // Act
      result.current.mutate({
        email: "jane@activecity.gov",
        password: "password123",
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith("/api/auth/login", {
        email: "jane@activecity.gov",
        password: "password123",
      });
      expect(localStorage.getItem("ac_token")).toBe("jwt-token-123");
    });

    it("does not store token when login fails", async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: false,
          message: "Invalid credentials",
          data: null,
        },
      };
      mockedAxios.post = vi.fn().mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useLogin(), { wrapper: Providers });

      // Act
      result.current.mutate({
        email: "jane@activecity.gov",
        password: "wrongpass",
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(localStorage.getItem("ac_token")).toBeNull();
    });

    it("sets error state when axios throws", async () => {
      // Arrange
      mockedAxios.post = vi
        .fn()
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useLogin(), { wrapper: Providers });

      // Act
      result.current.mutate({
        email: "jane@activecity.gov",
        password: "password123",
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("useRegister", () => {
    it("calls POST /api/auth/register with registration payload", async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: "Registration successful. Please verify your email.",
          data: null,
        },
      };
      mockedAxios.post = vi.fn().mockResolvedValueOnce(mockResponse);

      const payload = {
        fullName: "Jane Smith",
        email: "jane@activecity.gov",
        password: "password123",
        confirmPassword: "password123",
      };

      const { result } = renderHook(() => useRegister(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate(payload);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/auth/register",
        payload,
      );
      expect(result.current.data).toEqual(mockResponse.data);
    });

    it("sets error state when registration fails", async () => {
      // Arrange
      mockedAxios.post = vi
        .fn()
        .mockRejectedValueOnce(new Error("Email already taken"));

      const { result } = renderHook(() => useRegister(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate({
        fullName: "Jane Smith",
        email: "jane@activecity.gov",
        password: "password123",
        confirmPassword: "password123",
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useVerifyOtp", () => {
    it("calls POST /api/auth/verify-otp with email and otp", async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: "Email verified successfully",
          data: null,
        },
      };
      mockedAxios.post = vi.fn().mockResolvedValueOnce(mockResponse);

      const payload = { email: "jane@activecity.gov", otp: "123456" };

      const { result } = renderHook(() => useVerifyOtp(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate(payload);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/auth/verify-otp",
        payload,
      );
      expect(result.current.data).toEqual(mockResponse.data);
    });

    it("sets error state when OTP is invalid", async () => {
      // Arrange
      mockedAxios.post = vi
        .fn()
        .mockRejectedValueOnce(new Error("Invalid or expired OTP"));

      const { result } = renderHook(() => useVerifyOtp(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate({ email: "jane@activecity.gov", otp: "000000" });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useForgotPassword", () => {
    it("calls POST /api/auth/forgot-password with email", async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: "Password reset link sent",
          data: null,
        },
      };
      mockedAxios.post = vi.fn().mockResolvedValueOnce(mockResponse);

      const payload = { email: "jane@activecity.gov" };

      const { result } = renderHook(() => useForgotPassword(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate(payload);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/auth/forgot-password",
        payload,
      );
      expect(result.current.data).toEqual(mockResponse.data);
    });

    it("sets error state when email is not registered", async () => {
      // Arrange
      mockedAxios.post = vi
        .fn()
        .mockRejectedValueOnce(new Error("Email not found"));

      const { result } = renderHook(() => useForgotPassword(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate({ email: "unknown@example.com" });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe("useResetPassword", () => {
    it("calls POST /api/auth/reset-password with token and new password", async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          message: "Password reset successfully",
          data: null,
        },
      };
      mockedAxios.post = vi.fn().mockResolvedValueOnce(mockResponse);

      const payload = {
        token: "reset-token-abc",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      };

      const { result } = renderHook(() => useResetPassword(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate(payload);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "/api/auth/reset-password",
        payload,
      );
      expect(result.current.data).toEqual(mockResponse.data);
    });

    it("sets error state when reset token is invalid", async () => {
      // Arrange
      mockedAxios.post = vi
        .fn()
        .mockRejectedValueOnce(new Error("Invalid or expired reset token"));

      const { result } = renderHook(() => useResetPassword(), {
        wrapper: Providers,
      });

      // Act
      result.current.mutate({
        token: "bad-token",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});

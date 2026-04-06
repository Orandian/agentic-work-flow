import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { VerifyOtpForm } from "@/components/auth/VerifyOtpForm";
import { renderWithProviders } from "../../utils/renderWithProviders";

// Mock next/navigation with searchParams returning test email
const mockPush = vi.fn();
const mockGet = vi.fn().mockReturnValue("test@example.com");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

// Mock useAuth hook
const mockMutate = vi.fn();
const mockVerifyOtpState = {
  mutate: mockMutate,
  isPending: false,
  error: null,
  data: null,
};

vi.mock("@/hooks/useAuth", () => ({
  useVerifyOtp: () => mockVerifyOtpState,
}));

describe("VerifyOtpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyOtpState.isPending = false;
    mockVerifyOtpState.error = null;
    mockVerifyOtpState.data = null;
    mockVerifyOtpState.mutate = mockMutate;
    mockGet.mockReturnValue("test@example.com");
  });

  it("renders OTP input and submit button", () => {
    // Arrange & Act
    renderWithProviders(<VerifyOtpForm />);

    // Assert
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verify email/i }),
    ).toBeInTheDocument();
  });

  it("reads email from search params and displays it", () => {
    // Arrange & Act
    renderWithProviders(<VerifyOtpForm />);

    // Assert
    expect(mockGet).toHaveBeenCalledWith("email");
    expect(
      screen.getByText(/we sent a code to test@example.com/i),
    ).toBeInTheDocument();
  });

  it("calls useVerifyOtp mutate with email and otp on submit", async () => {
    // Arrange
    renderWithProviders(<VerifyOtpForm />);
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    // Assert
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { email: "test@example.com", otp: "123456" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });

  it("redirects to /login on success after timeout", async () => {
    // Arrange
    vi.useFakeTimers();
    mockMutate.mockImplementation(
      (
        _payload: unknown,
        options: {
          onSuccess: (data: { success: boolean; message?: string }) => void;
        },
      ) => {
        options.onSuccess({
          success: true,
          message: "Email verified successfully!",
        });
      },
    );
    renderWithProviders(<VerifyOtpForm />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    // Act
    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    // The success message should appear
    await waitFor(() => {
      expect(
        screen.getByText(/email verified successfully/i),
      ).toBeInTheDocument();
    });

    // Advance timer to trigger redirect
    vi.advanceTimersByTime(1500);

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    vi.useRealTimers();
  });

  it("shows error message on failure", () => {
    // Arrange
    mockVerifyOtpState.error = new Error("Invalid OTP code");

    // Act
    renderWithProviders(<VerifyOtpForm />);

    // Assert
    expect(screen.getByText("Invalid OTP code")).toBeInTheDocument();
  });

  it("shows error message when data.success is false", () => {
    // Arrange
    mockVerifyOtpState.data = {
      success: false,
      message: "OTP has expired",
      data: null,
    };

    // Act
    renderWithProviders(<VerifyOtpForm />);

    // Assert
    expect(screen.getByText("OTP has expired")).toBeInTheDocument();
  });

  it("disables submit button while pending", () => {
    // Arrange
    mockVerifyOtpState.isPending = true;

    // Act
    renderWithProviders(<VerifyOtpForm />);

    // Assert
    expect(screen.getByRole("button", { name: /verifying/i })).toBeDisabled();
  });

  it("disables submit button when otp length is less than 4 characters", async () => {
    // Arrange
    renderWithProviders(<VerifyOtpForm />);
    const user = userEvent.setup();

    // Act - type only 3 digits
    await user.type(screen.getByLabelText(/verification code/i), "123");

    // Assert
    expect(
      screen.getByRole("button", { name: /verify email/i }),
    ).toBeDisabled();
  });

  it("enables submit button when otp has at least 4 characters", async () => {
    // Arrange
    renderWithProviders(<VerifyOtpForm />);
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText(/verification code/i), "1234");

    // Assert
    expect(
      screen.getByRole("button", { name: /verify email/i }),
    ).not.toBeDisabled();
  });
});

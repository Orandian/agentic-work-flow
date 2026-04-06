import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { renderWithProviders } from "../../utils/renderWithProviders";

// Mock next/navigation (Link component needs router context)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock useAuth hook
const mockMutate = vi.fn();
const mockForgotPasswordState = {
  mutate: mockMutate,
  isPending: false,
  isSuccess: false,
  error: null,
  data: null,
};

vi.mock("@/hooks/useAuth", () => ({
  useForgotPassword: () => mockForgotPasswordState,
}));

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockForgotPasswordState.isPending = false;
    mockForgotPasswordState.isSuccess = false;
    mockForgotPasswordState.error = null;
    mockForgotPasswordState.data = null;
    mockForgotPasswordState.mutate = mockMutate;
  });

  it("renders email input and submit button", () => {
    // Arrange & Act
    renderWithProviders(<ForgotPasswordForm />);

    // Assert
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeInTheDocument();
  });

  it("calls useForgotPassword mutate with email on submit", async () => {
    // Arrange
    renderWithProviders(<ForgotPasswordForm />);
    const user = userEvent.setup();

    // Act
    await user.type(
      screen.getByLabelText(/email address/i),
      "staff@activecity.gov",
    );
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    // Assert
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        email: "staff@activecity.gov",
      });
    });
  });

  it("shows success message after successful submission", () => {
    // Arrange
    mockForgotPasswordState.isSuccess = true;
    mockForgotPasswordState.data = {
      success: true,
      message: "Reset link sent",
      data: null,
    };

    // Act
    renderWithProviders(<ForgotPasswordForm />);

    // Assert
    expect(screen.getByText(/reset link sent/i)).toBeInTheDocument();
  });

  it("hides form and shows success panel when isSuccess and data.success are true", () => {
    // Arrange
    mockForgotPasswordState.isSuccess = true;
    mockForgotPasswordState.data = {
      success: true,
      message: "Reset link sent",
      data: null,
    };

    // Act
    renderWithProviders(<ForgotPasswordForm />);

    // Assert - form inputs should not be visible
    expect(
      screen.queryByRole("button", { name: /send reset link/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
  });

  it("shows error message on mutation Error instance failure", () => {
    // Arrange
    mockForgotPasswordState.error = new Error("No account with that email");

    // Act
    renderWithProviders(<ForgotPasswordForm />);

    // Assert
    expect(screen.getByText("No account with that email")).toBeInTheDocument();
  });

  it("shows error message when data.success is false", () => {
    // Arrange
    mockForgotPasswordState.data = {
      success: false,
      message: "Email not found",
      data: null,
    };

    // Act
    renderWithProviders(<ForgotPasswordForm />);

    // Assert
    expect(screen.getByText("Email not found")).toBeInTheDocument();
  });

  it("disables submit button while loading", () => {
    // Arrange
    mockForgotPasswordState.isPending = true;

    // Act
    renderWithProviders(<ForgotPasswordForm />);

    // Assert
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
  });
});

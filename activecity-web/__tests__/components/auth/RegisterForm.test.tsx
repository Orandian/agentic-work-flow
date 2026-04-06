import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { renderWithProviders } from "../../utils/renderWithProviders";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth hook
const mockMutate = vi.fn();
const mockRegisterState = {
  mutate: mockMutate,
  isPending: false,
  error: null,
  data: null,
};

vi.mock("@/hooks/useAuth", () => ({
  useRegister: () => mockRegisterState,
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterState.isPending = false;
    mockRegisterState.error = null;
    mockRegisterState.data = null;
    mockRegisterState.mutate = mockMutate;
  });

  it("renders fullName, email, password, confirmPassword inputs", () => {
    // Arrange & Act
    renderWithProviders(<RegisterForm />);

    // Assert
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i }),
    ).toBeInTheDocument();
  });

  it("shows error when passwords do not match (client-side)", async () => {
    // Arrange
    renderWithProviders(<RegisterForm />);
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/email address/i),
      "jane@activecity.gov",
    );
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(
      screen.getByLabelText(/confirm password/i),
      "differentpass",
    );
    await user.click(screen.getByRole("button", { name: /create account/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows error when password is less than 8 characters", async () => {
    // Arrange
    renderWithProviders(<RegisterForm />);
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/email address/i),
      "jane@activecity.gov",
    );
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls useRegister mutate with correct payload on submit", async () => {
    // Arrange
    renderWithProviders(<RegisterForm />);
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/email address/i),
      "jane@activecity.gov",
    );
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    // Assert
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          fullName: "Jane Smith",
          email: "jane@activecity.gov",
          password: "password123",
          confirmPassword: "password123",
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });

  it("redirects to /verify-otp?email=<email> on success", async () => {
    // Arrange
    mockMutate.mockImplementation(
      (
        _payload: unknown,
        options: { onSuccess: (data: { success: boolean }) => void },
      ) => {
        options.onSuccess({ success: true });
      },
    );
    renderWithProviders(<RegisterForm />);
    const user = userEvent.setup();

    // Act
    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(
      screen.getByLabelText(/email address/i),
      "jane@activecity.gov",
    );
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/verify-otp?email=jane%40activecity.gov",
      );
    });
  });

  it("shows error message from mutation on failure", () => {
    // Arrange
    mockRegisterState.error = new Error("Email already registered");

    // Act
    renderWithProviders(<RegisterForm />);

    // Assert
    expect(screen.getByText("Email already registered")).toBeInTheDocument();
  });

  it("shows error message when data.success is false", () => {
    // Arrange
    mockRegisterState.data = {
      success: false,
      message: "Registration failed",
      data: null,
    };

    // Act
    renderWithProviders(<RegisterForm />);

    // Assert
    expect(screen.getByText("Registration failed")).toBeInTheDocument();
  });

  it("disables button while loading", () => {
    // Arrange
    mockRegisterState.isPending = true;

    // Act
    renderWithProviders(<RegisterForm />);

    // Assert
    expect(
      screen.getByRole("button", { name: /creating account/i }),
    ).toBeDisabled();
  });
});

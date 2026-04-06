import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { LoginForm } from "@/components/auth/LoginForm";
import { renderWithProviders } from "../../utils/renderWithProviders";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock useAuth hook
const mockMutate = vi.fn();
const mockLoginState = {
  mutate: mockMutate,
  isPending: false,
  error: null,
  data: null,
};

vi.mock("@/hooks/useAuth", () => ({
  useLogin: () => mockLoginState,
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginState.isPending = false;
    mockLoginState.error = null;
    mockLoginState.data = null;
    mockLoginState.mutate = mockMutate;
  });

  it("renders email and password inputs and submit button", () => {
    // Arrange & Act
    renderWithProviders(<LoginForm />);

    // Assert
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("calls useLogin mutate with email and password on submit", async () => {
    // Arrange
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();

    // Act
    await user.type(
      screen.getByLabelText(/email address/i),
      "staff@activecity.gov",
    );
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Assert
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        { email: "staff@activecity.gov", password: "password123" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });

  it("shows error message when mutation returns error", () => {
    // Arrange
    mockLoginState.error = new Error("Invalid credentials");

    // Act
    renderWithProviders(<LoginForm />);

    // Assert
    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });

  it("shows error message when data.success is false", () => {
    // Arrange
    mockLoginState.data = {
      success: false,
      message: "Wrong password",
      data: null,
    };

    // Act
    renderWithProviders(<LoginForm />);

    // Assert
    expect(screen.getByText("Wrong password")).toBeInTheDocument();
  });

  it("disables submit button while loading", () => {
    // Arrange
    mockLoginState.isPending = true;

    // Act
    renderWithProviders(<LoginForm />);

    // Assert
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });

  it("redirects to /dashboard on successful login", async () => {
    // Arrange
    mockMutate.mockImplementation(
      (
        _payload: unknown,
        options: {
          onSuccess: (data: {
            success: boolean;
            data: { token: string };
          }) => void;
        },
      ) => {
        options.onSuccess({ success: true, data: { token: "fake-token" } });
      },
    );
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();

    // Act
    await user.type(
      screen.getByLabelText(/email address/i),
      "staff@activecity.gov",
    );
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("does not redirect when login data.success is false", async () => {
    // Arrange
    mockMutate.mockImplementation(
      (
        _payload: unknown,
        options: { onSuccess: (data: { success: boolean }) => void },
      ) => {
        options.onSuccess({ success: false });
      },
    );
    renderWithProviders(<LoginForm />);
    const user = userEvent.setup();

    // Act
    await user.type(
      screen.getByLabelText(/email address/i),
      "staff@activecity.gov",
    );
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    // Assert
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});

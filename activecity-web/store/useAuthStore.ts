"use client";

import { create } from "zustand";

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "STAFF" | "ADMIN";
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));

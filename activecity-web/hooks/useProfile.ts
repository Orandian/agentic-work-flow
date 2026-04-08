"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  UserProfile,
  UpdateProfilePayload,
  ChangePasswordPayload,
} from "@/types/portal";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useProfile() {
  return useQuery<UserProfile, Error>({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } =
        await axios.get<Envelope<UserProfile>>("/api/user/profile");
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation<UserProfile, Error, UpdateProfilePayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.put<Envelope<UserProfile>>(
        "/api/user/profile",
        payload,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useChangePassword() {
  return useMutation<void, Error, ChangePasswordPayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post<Envelope<null>>(
        "/api/user/change-password",
        payload,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
    },
  });
}

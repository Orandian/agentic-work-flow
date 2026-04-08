"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  StaffMember,
  StaffStats,
  CreateStaffPayload,
  UpdateStaffPayload,
  PaginatedResponse,
} from "@/types/portal";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const STAFF_KEYS = {
  list: (search: string, dept: string, page: number) =>
    ["staff", "list", search, dept, page] as const,
  stats: ["staff", "stats"] as const,
  detail: (id: number) => ["staff", id] as const,
};

export function useStaffList(
  search: string,
  department: string,
  page = 1,
  pageSize = 20,
) {
  return useQuery<PaginatedResponse<StaffMember>, Error>({
    queryKey: STAFF_KEYS.list(search, department, page),
    queryFn: async () => {
      const { data } = await axios.get<
        Envelope<PaginatedResponse<StaffMember>>
      >("/api/admin/staff", {
        params: { search, department, page, pageSize },
      });
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useStaffStats() {
  return useQuery<StaffStats, Error>({
    queryKey: STAFF_KEYS.stats,
    queryFn: async () => {
      const { data } = await axios.get<Envelope<StaffStats>>(
        "/api/admin/staff/stats",
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation<StaffMember, Error, CreateStaffPayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post<Envelope<StaffMember>>(
        "/api/admin/staff",
        payload,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation<
    StaffMember,
    Error,
    { id: number; payload: UpdateStaffPayload }
  >({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axios.put<Envelope<StaffMember>>(
        `/api/admin/staff/${id}`,
        payload,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await axios.delete(`/api/admin/staff/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

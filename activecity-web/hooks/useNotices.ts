"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  Notice,
  SaveNoticePayload,
  PaginatedResponse,
} from "@/types/portal";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useNoticeList(type = "", status = "", page = 1, pageSize = 20) {
  return useQuery<PaginatedResponse<Notice>, Error>({
    queryKey: ["notices", "list", type, status, page],
    queryFn: async () => {
      const { data } = await axios.get<Envelope<PaginatedResponse<Notice>>>(
        "/api/admin/notices",
        {
          params: { type, status, page, pageSize },
        },
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateNotice() {
  const qc = useQueryClient();
  return useMutation<Notice, Error, SaveNoticePayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post<Envelope<Notice>>(
        "/api/admin/notices",
        payload,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useUpdateNotice() {
  const qc = useQueryClient();
  return useMutation<Notice, Error, { id: number; payload: SaveNoticePayload }>(
    {
      mutationFn: async ({ id, payload }) => {
        const { data } = await axios.put<Envelope<Notice>>(
          `/api/admin/notices/${id}`,
          payload,
        );
        if (!data.success) throw new Error(data.message ?? "Failed");
        return data.data;
      },
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ["notices"] });
      },
    },
  );
}

export function usePublishNotice() {
  const qc = useQueryClient();
  return useMutation<Notice, Error, number>({
    mutationFn: async (id) => {
      const { data } = await axios.put<Envelope<Notice>>(
        `/api/admin/notices/${id}/publish`,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

export function useDeleteNotice() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await axios.delete(`/api/admin/notices/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notices"] });
    },
  });
}

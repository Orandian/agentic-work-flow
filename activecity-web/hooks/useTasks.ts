"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import type {
  Task,
  TaskStats,
  SaveTaskPayload,
  PaginatedResponse,
} from "@/types/portal";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useTaskList(
  status = "",
  search = "",
  priority = "",
  page = 1,
  pageSize = 20,
) {
  return useQuery<PaginatedResponse<Task>, Error>({
    queryKey: ["tasks", "list", status, search, priority, page],
    queryFn: async () => {
      const { data } = await axios.get<Envelope<PaginatedResponse<Task>>>(
        "/api/admin/tasks",
        {
          params: { status, search, priority, page, pageSize },
        },
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useTaskStats() {
  return useQuery<TaskStats, Error>({
    queryKey: ["tasks", "stats"],
    queryFn: async () => {
      const { data } = await axios.get<Envelope<TaskStats>>(
        "/api/admin/tasks/stats",
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation<Task, Error, SaveTaskPayload>({
    mutationFn: async (payload) => {
      const { data } = await axios.post<Envelope<Task>>(
        "/api/admin/tasks",
        payload,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: number; payload: SaveTaskPayload }>({
    mutationFn: async ({ id, payload }) => {
      const { data } = await axios.put<Envelope<Task>>(
        `/api/admin/tasks/${id}`,
        payload,
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation<Task, Error, { id: number; status: string }>({
    mutationFn: async ({ id, status }) => {
      const { data } = await axios.put<Envelope<Task>>(
        `/api/admin/tasks/${id}/status`,
        { status },
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await axios.delete(`/api/admin/tasks/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

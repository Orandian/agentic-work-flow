"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { DashboardStats, ActivityItem } from "@/types/portal";

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useDashboardStats() {
  return useQuery<DashboardStats, Error>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const { data } = await axios.get<Envelope<DashboardStats>>(
        "/api/admin/dashboard/stats",
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useDashboardActivity() {
  return useQuery<ActivityItem[], Error>({
    queryKey: ["dashboard", "activity"],
    queryFn: async () => {
      const { data } = await axios.get<Envelope<ActivityItem[]>>(
        "/api/admin/dashboard/activity",
      );
      if (!data.success) throw new Error(data.message ?? "Failed");
      return data.data;
    },
    staleTime: 30 * 1000,
  });
}

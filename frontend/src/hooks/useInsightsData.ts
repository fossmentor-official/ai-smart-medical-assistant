// src/hooks/useInsightsData.ts
// React Query hooks for the AI Insights Dashboard.
// Requires @tanstack/react-query ≥5 (already common in shadcn/ui stacks).
// If not present: npm install @tanstack/react-query

import { useQuery } from "@tanstack/react-query";
import {
  fetchMetrics,
  fetchPatientTrends,
  fetchRevenueForecast,
  fetchNoShowRisk,
} from "@/lib/insightsApi";
import type { Period } from "@/types/insights";

const CLINIC_ID = "clinic_demo_001"; // TODO: pull from Supabase auth context

export function useClinicMetrics(period: Period = "30d") {
  return useQuery({
    queryKey: ["insights-metrics", CLINIC_ID, period],
    queryFn:  () => fetchMetrics(CLINIC_ID, period),
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function usePatientTrends(period: "7d" | "30d" | "90d" = "30d") {
  return useQuery({
    queryKey: ["patient-trends", CLINIC_ID, period],
    queryFn:  () => fetchPatientTrends(CLINIC_ID, period),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRevenueForecast(growthRate: number = 7) {
  return useQuery({
    queryKey: ["revenue-forecast", CLINIC_ID, growthRate],
    queryFn:  () => fetchRevenueForecast(CLINIC_ID, growthRate),
    staleTime: 10 * 60 * 1000,
  });
}

export function useNoShowRisk() {
  return useQuery({
    queryKey: ["noshow-risk", CLINIC_ID],
    queryFn:  () => fetchNoShowRisk(CLINIC_ID),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,  // auto-refresh every 10 min
  });
}

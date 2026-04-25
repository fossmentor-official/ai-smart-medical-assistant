// src/lib/insightsApi.ts
// Thin fetch wrappers for the AI Insights backend endpoints.
// All functions throw on non-2xx so callers can catch and show errors.

import type {
  ClinicMetrics,
  DailyVisit,
  RevenueData,
  NoShowData,
  Period,
} from "@/types/insights";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}] ${text}`);
  }
  return res.json() as Promise<T>;
}

// Placeholder: replace with real clinic_id from Supabase auth session
const DEMO_CLINIC_ID = "clinic_demo_001";

export async function fetchMetrics(
  clinicId: string = DEMO_CLINIC_ID,
  period: Period = "30d"
): Promise<ClinicMetrics> {
  return get<ClinicMetrics>(
    `/api/insights/metrics?clinic_id=${clinicId}&period=${period}`
  );
}

export async function fetchPatientTrends(
  clinicId: string = DEMO_CLINIC_ID,
  period: "7d" | "30d" | "90d" = "30d"
): Promise<DailyVisit[]> {
  return get<DailyVisit[]>(
    `/api/insights/patient-trends?clinic_id=${clinicId}&period=${period}`
  );
}

export async function fetchRevenueForecast(
  clinicId: string = DEMO_CLINIC_ID,
  growthRate = 7
): Promise<RevenueData> {
  return get<RevenueData>(
    `/api/insights/revenue-forecast?clinic_id=${clinicId}&growth_rate=${growthRate}`
  );
}

export async function fetchNoShowRisk(
  clinicId: string = DEMO_CLINIC_ID
): Promise<NoShowData> {
  return get<NoShowData>(
    `/api/insights/noshow-risk?clinic_id=${clinicId}`
  );
}

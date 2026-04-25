// src/types/insights.ts
// TypeScript interfaces that mirror the backend Pydantic schemas in insights_service.py

export type Period = "7d" | "30d" | "90d" | "1y";
export type RiskTier = "high" | "mid" | "low";
export type Direction = "up" | "down" | "flat";

// ── Metrics ──────────────────────────────────────────────────────────────────

export interface MetricDelta {
  value: number;
  delta_pct: number;
  direction: Direction;
}

export interface ClinicMetrics {
  period: Period;
  total_patients: MetricDelta;
  appointments: MetricDelta;
  noshow_rate: MetricDelta;
  revenue_total: MetricDelta;
}

// ── Patient Trends ────────────────────────────────────────────────────────────

export interface DailyVisit {
  date: string;    // ISO "2025-01-15"
  visits: number;
  trend: number;   // AI-smoothed
}

// ── Revenue Forecast ──────────────────────────────────────────────────────────

export interface RevenuePeriod {
  month: string;
  actual:    number | null;
  forecast:  number | null;
  lower_ci:  number | null;
  upper_ci:  number | null;
}

export interface RevenueData {
  currency: string;
  series: RevenuePeriod[];
  confidence_pct: number;
  model_note: string;
}

// ── No-Show Risk ──────────────────────────────────────────────────────────────

export interface NoShowPatient {
  patient_id: string;
  patient_name: string;
  appointment_time: string;
  department: string;
  risk_pct: number;
  risk_tier: RiskTier;
  risk_factors: string[];
}

export interface FeatureFactor {
  label: string;
  importance: number;
}

export interface NoShowData {
  patients: NoShowPatient[];
  feature_importance: FeatureFactor[];
  model_version: string;
  accuracy_note: string;
}

// ── UI state ──────────────────────────────────────────────────────────────────

export type InsightsTab = "overview" | "revenue" | "noshow";

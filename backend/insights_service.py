"""
insights_service.py  —  AI Insights Dashboard
TotalCura · Backend Service

Provides:
  • Clinic performance metrics with period deltas
  • Patient visit trends (daily series)
  • Revenue forecast (linear extrapolation; swap for Prophet when data volume grows)
  • No-show risk scoring (heuristic model; swap for XGBoost when labelled dataset is ready)

All endpoints are wired into main.py via:
    app.include_router(insights_router)
"""

from __future__ import annotations

import math
import random
from datetime import date, datetime, timedelta
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

# ─── Router ────────────────────────────────────────────────────────────────────
insights_router = APIRouter(prefix="/api/insights", tags=["AI Insights"])


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class MetricDelta(BaseModel):
    value: float
    delta_pct: float          # positive = up, negative = down
    direction: Literal["up", "down", "flat"]

class ClinicMetrics(BaseModel):
    period: str
    total_patients: MetricDelta
    appointments: MetricDelta
    noshow_rate: MetricDelta   # percentage, e.g. 18.2
    revenue_total: MetricDelta  # in PKR thousands

class DailyVisit(BaseModel):
    date: str                  # ISO date string  "2025-01-01"
    visits: int
    trend: float               # AI-smoothed moving average

class RevenuePeriod(BaseModel):
    month: str                 # "Jan", "Feb" …
    actual: Optional[float]    # None for future months
    forecast: Optional[float]
    lower_ci: Optional[float]
    upper_ci: Optional[float]

class RevenueData(BaseModel):
    currency: str
    series: List[RevenuePeriod]
    confidence_pct: int
    model_note: str

class NoShowPatient(BaseModel):
    patient_id: str
    patient_name: str
    appointment_time: str
    department: str
    risk_pct: float
    risk_tier: Literal["high", "mid", "low"]
    risk_factors: List[str]

class FeatureFactor(BaseModel):
    label: str
    importance: int            # 0-100

class NoShowData(BaseModel):
    patients: List[NoShowPatient]
    feature_importance: List[FeatureFactor]
    model_version: str
    accuracy_note: str


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _delta(current: float, prior: float) -> MetricDelta:
    if prior == 0:
        pct = 0.0
    else:
        pct = round((current - prior) / prior * 100, 1)
    return MetricDelta(
        value=current,
        delta_pct=pct,
        direction="up" if pct > 0.5 else ("down" if pct < -0.5 else "flat"),
    )


def _moving_avg(series: List[int], window: int = 5) -> List[float]:
    result = []
    for i, v in enumerate(series):
        sl = series[max(0, i - window // 2): i + window // 2 + 1]
        result.append(round(sum(sl) / len(sl), 1))
    return result


def _seed_from_clinic(clinic_id: str) -> int:
    """Deterministic seed from clinic_id so demo data is stable per clinic."""
    return sum(ord(c) for c in clinic_id) % 9999


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@insights_router.get("/metrics", response_model=ClinicMetrics)
async def get_clinic_metrics(
    clinic_id: str = Query(..., description="Clinic / organisation identifier"),
    period: Literal["7d", "30d", "90d", "1y"] = Query("30d"),
):
    """
    Returns KPI cards for the AI Insights Overview tab.
    In production: replace with real Supabase / PostgreSQL aggregation queries.
    """
    rng = random.Random(_seed_from_clinic(clinic_id))

    base_patients  = rng.randint(900, 1800)
    base_appts     = rng.randint(280, 500)
    base_noshow    = round(rng.uniform(12.0, 24.0), 1)
    base_revenue   = round(rng.uniform(1500, 3500), 0)

    # Simulate slight growth vs prior period
    mult = {"7d": 0.98, "30d": 1.084, "90d": 1.12, "1y": 1.22}[period]
    prior_p = round(base_patients / mult)
    prior_a = round(base_appts / mult)
    prior_n = round(base_noshow * 1.06, 1)      # noshow improving (lower is better)
    prior_r = round(base_revenue / mult, 0)

    return ClinicMetrics(
        period=period,
        total_patients=_delta(base_patients, prior_p),
        appointments=_delta(base_appts, prior_a),
        noshow_rate=_delta(base_noshow, prior_n),
        revenue_total=_delta(base_revenue, prior_r),
    )


@insights_router.get("/patient-trends", response_model=List[DailyVisit])
async def get_patient_trends(
    clinic_id: str = Query(...),
    period: Literal["7d", "30d", "90d"] = Query("30d"),
):
    """
    Daily visit series with AI trend smoothing.
    In production: query appointments table grouped by date.
    """
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    rng  = random.Random(_seed_from_clinic(clinic_id) + 1)

    raw: List[int] = []
    base = rng.randint(15, 25)
    for i in range(days):
        # slight upward drift + noise + weekly seasonality
        seasonal = 3 if (i % 7) not in (5, 6) else -5      # weekends dip
        v = max(2, base + seasonal + rng.randint(-6, 8) + int(i * 0.15))
        raw.append(v)

    smooth = _moving_avg(raw, window=5)
    today  = date.today()
    return [
        DailyVisit(
            date=(today - timedelta(days=days - 1 - i)).isoformat(),
            visits=raw[i],
            trend=smooth[i],
        )
        for i in range(days)
    ]


@insights_router.get("/revenue-forecast", response_model=RevenueData)
async def get_revenue_forecast(
    clinic_id: str = Query(...),
    growth_rate: float = Query(7.0, ge=-20.0, le=50.0,
                               description="Monthly growth % assumption"),
):
    """
    6 months actuals + 3 months forecast with confidence bands.
    In production: fit a Prophet / ARIMA model on revenue_records table.
    """
    rng   = random.Random(_seed_from_clinic(clinic_id) + 2)
    base  = rng.uniform(1600, 2400)
    months_actual = 6
    months_forecast = 3
    month_names = ["Jan","Feb","Mar","Apr","May","Jun",
                   "Jul","Aug","Sep","Oct","Nov","Dec"]
    today = date.today()
    start_month = today.month - months_actual  # may be negative — handle below

    series: List[RevenuePeriod] = []

    # Actuals (past 6 months)
    for i in range(months_actual):
        noise = rng.uniform(0.88, 1.14)
        val   = round(base * (1 + growth_rate / 100) ** i * noise, 0)
        m_idx = (start_month + i - 1) % 12
        series.append(RevenuePeriod(
            month=month_names[m_idx],
            actual=val,
            forecast=None, lower_ci=None, upper_ci=None,
        ))

    # Last actual is bridge point for forecast
    last_actual = series[-1].actual or base

    # Forecast (next 3 months)
    for i in range(1, months_forecast + 1):
        yhat  = round(last_actual * (1 + growth_rate / 100) ** i, 0)
        ci    = 0.10 + i * 0.03                   # wider CI further out
        m_idx = (start_month + months_actual + i - 1) % 12
        series.append(RevenuePeriod(
            month=month_names[m_idx],
            actual=None,
            forecast=yhat,
            lower_ci=round(yhat * (1 - ci), 0),
            upper_ci=round(yhat * (1 + ci), 0),
        ))

    return RevenueData(
        currency="PKR",
        series=series,
        confidence_pct=82,
        model_note="Linear trend model · Upgrade to Prophet for seasonality",
    )


@insights_router.get("/noshow-risk", response_model=NoShowData)
async def get_noshow_risk(
    clinic_id: str = Query(...),
):
    """
    Today's appointment list with AI-scored no-show risk.
    In production: load from appointments table, run XGBoost pipeline,
    cache predictions in ai_predictions table.
    """
    rng = random.Random(_seed_from_clinic(clinic_id) + 3)

    # Simulated patient roster
    names = [
        ("Ayesha Khan",   "Cardiology",    "9:00 AM"),
        ("Bilal Mahmood", "General",       "9:30 AM"),
        ("Sara Iqbal",    "Orthopaedics",  "10:00 AM"),
        ("Usman Ali",     "General",       "10:30 AM"),
        ("Fatima Raza",   "Cardiology",    "11:00 AM"),
        ("Hassan Tariq",  "ENT",           "11:30 AM"),
        ("Zara Sheikh",   "Orthopaedics",  "2:00 PM"),
        ("Kamran Butt",   "General",       "2:30 PM"),
        ("Nimra Aslam",   "Dermatology",   "3:00 PM"),
        ("Tariq Mehmood", "General",       "3:30 PM"),
    ]

    all_factors = [
        "Prior no-show history",
        "Booked > 7 days ago",
        "No reminder sent",
        "First-time patient",
        "Long commute inferred",
        "Afternoon slot (lower compliance)",
    ]

    patients: List[NoShowPatient] = []
    for idx, (name, dept, time) in enumerate(names):
        risk = round(rng.uniform(15, 95), 1)
        tier: Literal["high", "mid", "low"] = (
            "high" if risk >= 70 else "mid" if risk >= 45 else "low"
        )
        n_factors = 3 if risk >= 70 else (2 if risk >= 45 else 1)
        factors   = rng.sample(all_factors, min(n_factors, len(all_factors)))
        patients.append(NoShowPatient(
            patient_id=f"PT{1000 + idx}",
            patient_name=name,
            appointment_time=time,
            department=dept,
            risk_pct=risk,
            risk_tier=tier,
            risk_factors=factors,
        ))

    patients.sort(key=lambda p: -p.risk_pct)

    feature_importance = [
        FeatureFactor(label="Prior no-show history",     importance=91),
        FeatureFactor(label="Days since last visit",     importance=74),
        FeatureFactor(label="Appointment lead time",     importance=68),
        FeatureFactor(label="Weather forecast score",    importance=52),
        FeatureFactor(label="Time of day",               importance=47),
        FeatureFactor(label="Reminders sent",            importance=38),
        FeatureFactor(label="Distance to clinic (est.)", importance=29),
    ]

    return NoShowData(
        patients=patients,
        feature_importance=feature_importance,
        model_version="v2.4-heuristic",
        accuracy_note="Switch to trained XGBoost model once 500+ labelled records are available.",
    )

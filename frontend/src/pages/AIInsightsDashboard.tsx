// src/pages/AIInsightsDashboard.tsx
// TotalCura — AI Insights Dashboard
// Tabs: Overview · Revenue AI · No-Show Risk
// Charts: Chart.js via react-chartjs-2
// Requires: npm install chart.js react-chartjs-2 @tanstack/react-query

import { useState, useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Tooltip as CJTooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useClinicMetrics,
  usePatientTrends,
  useRevenueForecast,
  useNoShowRisk,
} from "@/hooks/useInsightsData";
import type { InsightsTab, MetricDelta, Period, NoShowPatient } from "@/types/insights";

// Register Chart.js components
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, CJTooltip, Legend
);

// ─── Colour tokens matching TotalCura's teal-first palette ───────────────────
const C = {
  teal:      "#1D9E75",
  tealLight: "rgba(29,158,117,0.10)",
  blue:      "#378ADD",
  blueLight: "rgba(55,138,221,0.10)",
  coral:     "#D85A30",
  purple:    "#7F77DD",
  amber:     "#BA7517",
  gray:      "rgba(120,120,120,0.15)",
};

const RISK_COLOR: Record<string, string> = {
  high: "#D85A30",
  mid:  "#BA7517",
  low:  "#1D9E75",
};

const RISK_BG: Record<string, string> = {
  high: "bg-orange-50 border-orange-200 text-orange-700",
  mid:  "bg-amber-50 border-amber-200 text-amber-700",
  low:  "bg-emerald-50 border-emerald-200 text-emerald-700",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  metric,
  prefix = "",
  suffix = "",
  accent,
  invertDelta = false,
}: {
  label: string;
  metric: MetricDelta | undefined;
  prefix?: string;
  suffix?: string;
  accent: string;
  invertDelta?: boolean;
}) {
  if (!metric) return <Skeleton className="h-24 rounded-xl" />;

  const isGood =
    invertDelta
      ? metric.direction === "down"   // for no-show: down is good
      : metric.direction === "up";

  const arrow  = metric.direction === "up" ? "▲" : metric.direction === "down" ? "▼" : "—";
  const deltaColor = isGood ? "text-emerald-600" : "text-rose-500";

  return (
    <div
      className="rounded-xl p-4 bg-card border border-border relative overflow-hidden"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-mono font-bold text-foreground">
        {prefix}{metric.value.toLocaleString()}{suffix}
      </p>
      <p className={`text-xs mt-1 ${deltaColor}`}>
        {arrow} {Math.abs(metric.delta_pct)}% vs prior period
        {invertDelta && metric.direction === "down" ? " · ✓ improving" : ""}
      </p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-card border border-border text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ period }: { period: Period }) {
  const { data: metrics } = useClinicMetrics(period);
  const { data: trends, isLoading: trendsLoading } = usePatientTrends(
    period === "1y" ? "90d" : (period as "7d" | "30d" | "90d")
  );

  const trendsChartData = useMemo(() => {
    if (!trends) return null;
    const labels = trends.map((d) => {
      const dt = new Date(d.date);
      return `${dt.getDate()}/${dt.getMonth() + 1}`;
    });
    return {
      labels,
      datasets: [
        {
          label: "Visits",
          data: trends.map((d) => d.visits),
          borderColor: C.blue,
          borderWidth: 1.5,
          pointRadius: 2,
          backgroundColor: C.blueLight,
          fill: true,
          tension: 0.35,
        },
        {
          label: "AI Trend",
          data: trends.map((d) => d.trend),
          borderColor: C.teal,
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          fill: false,
          tension: 0.5,
        },
      ],
    };
  }, [trends]);

  const deptData = {
    labels: ["General", "Cardiology", "Orthopaedics", "Other"],
    datasets: [
      {
        data: [42, 23, 18, 17],
        backgroundColor: [C.teal, C.blue, C.coral, C.purple],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Patients"  metric={metrics?.total_patients} accent={C.teal} />
        <MetricCard label="Appointments"    metric={metrics?.appointments}   accent={C.blue} />
        <MetricCard label="No-Show Rate"    metric={metrics?.noshow_rate}    accent={C.coral}  suffix="%" invertDelta />
        <MetricCard label="Revenue (PKR K)" metric={metrics?.revenue_total}  accent={C.purple} prefix="₨ " />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trend chart — 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Patient visit trends</CardTitle>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-200 text-blue-600 bg-blue-50">
                AI SMOOTHED
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Daily visits with moving-average trend line</p>
          </CardHeader>
          <CardContent>
            {trendsLoading || !trendsChartData ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="relative h-48">
                <Line
                  data={trendsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: {
                        ticks: { font: { size: 10 }, maxTicksLimit: 10, autoSkip: true },
                        grid: { display: false },
                      },
                      y: {
                        ticks: { font: { size: 10 } },
                        grid: { color: "rgba(128,128,128,0.08)" },
                      },
                    },
                  }}
                />
              </div>
            )}
            {/* Custom legend */}
            <div className="flex gap-4 mt-3">
              {[
                { color: C.blue,  label: "Daily visits", dashed: false },
                { color: C.teal,  label: "AI trend",     dashed: true },
              ].map(({ color, label, dashed }) => (
                <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block w-6 h-0.5"
                    style={{
                      background: color,
                      borderTop: dashed ? `2px dashed ${color}` : undefined,
                    }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dept donut — 1/3 width */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Visit type split</CardTitle>
            <p className="text-xs text-muted-foreground">By department</p>
          </CardHeader>
          <CardContent>
            <div className="relative h-36 mx-auto max-w-[160px]">
              <Doughnut
                data={deptData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: "65%",
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
              {deptData.labels.map((lbl, i) => (
                <span key={lbl} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: deptData.datasets[0].backgroundColor[i] }}
                  />
                  {lbl} {deptData.datasets[0].data[i]}%
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Tab: Revenue AI ──────────────────────────────────────────────────────────

function RevenueTab() {
  const [growth, setGrowth] = useState(7);
  const { data: rev, isLoading } = useRevenueForecast(growth);

  const chartData = useMemo(() => {
    if (!rev) return null;
    const s = rev.series;
    return {
      labels: s.map((p) => p.month),
      datasets: [
        {
          label: "Actuals",
          data: s.map((p) => p.actual),
          borderColor: C.teal,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: C.teal,
          fill: false,
          tension: 0.3,
          spanGaps: false,
        },
        {
          label: "AI Forecast",
          data: s.map((p) => p.forecast),
          borderColor: C.blue,
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 3,
          fill: "+1",
          backgroundColor: C.blueLight,
          tension: 0.3,
          spanGaps: false,
        },
        {
          label: "Upper CI",
          data: s.map((p) => p.upper_ci),
          borderColor: "rgba(55,138,221,0.25)",
          borderWidth: 0.5,
          pointRadius: 0,
          fill: false,
          tension: 0.3,
          spanGaps: false,
        },
        {
          label: "Lower CI",
          data: s.map((p) => p.lower_ci),
          borderColor: "rgba(55,138,221,0.25)",
          borderWidth: 0.5,
          pointRadius: 0,
          fill: "-1",
          backgroundColor: "rgba(55,138,221,0.06)",
          tension: 0.3,
          spanGaps: false,
        },
      ],
    };
  }, [rev]);

  // Next-quarter forecast (last 3 points)
  const nextQTotal = rev
    ? rev.series
        .filter((p) => p.forecast !== null)
        .reduce((s, p) => s + (p.forecast ?? 0), 0)
    : 0;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-sm font-medium">Revenue prediction model</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                6-month actuals + 3-month AI forecast with confidence band
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-blue-200 text-blue-600 bg-blue-50">
              ML FORECAST · {rev?.confidence_pct ?? "—"}% CONF
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Growth rate slider */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
              Growth assumption:
            </label>
            <input
              type="range"
              min={-5}
              max={20}
              step={1}
              value={growth}
              onChange={(e) => setGrowth(Number(e.target.value))}
              className="flex-1 accent-emerald-600"
            />
            <span className="font-mono text-xs font-semibold text-foreground w-20 text-right">
              {growth >= 0 ? "+" : ""}{growth}% / mo
            </span>
          </div>

          {isLoading || !chartData ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <div className="relative h-56">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                    y: {
                      ticks: {
                        font: { size: 10 },
                        callback: (v) => `₨${(Number(v) / 1000).toFixed(1)}M`,
                      },
                      grid: { color: "rgba(128,128,128,0.08)" },
                    },
                  },
                }}
              />
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3">
            {[
              { color: C.teal, label: "Actuals",     dashed: false },
              { color: C.blue, label: "AI Forecast", dashed: true  },
            ].map(({ color, label, dashed }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block w-6 h-0.5" style={{ background: color, borderTop: dashed ? `2px dashed ${color}` : undefined }} />
                {label}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block w-6 h-3 rounded-sm" style={{ background: C.blueLight, border: `1px solid rgba(55,138,221,0.3)` }} />
              Confidence band
            </span>
          </div>

          {rev && (
            <p className="text-[11px] text-muted-foreground mt-2 italic">{rev.model_note}</p>
          )}
        </CardContent>
      </Card>

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-4 bg-card border border-border" style={{ borderLeft: `3px solid ${C.teal}` }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Next Quarter (AI)</p>
          <p className="text-xl font-mono font-bold">₨ {(nextQTotal / 1000).toFixed(2)}M</p>
          <p className="text-xs text-emerald-600 mt-1">▲ Conf: {rev?.confidence_pct ?? "—"}%</p>
        </div>
        <div className="rounded-xl p-4 bg-card border border-border" style={{ borderLeft: `3px solid ${C.blue}` }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Revenue / Patient</p>
          <p className="text-xl font-mono font-bold">₨ 4,200</p>
          <p className="text-xs text-emerald-600 mt-1">▲ 6.2% vs last Q</p>
        </div>
        <div className="rounded-xl p-4 bg-card border border-border col-span-2 md:col-span-1" style={{ borderLeft: `3px solid ${C.coral}` }}>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">At-Risk Revenue</p>
          <p className="text-xl font-mono font-bold">₨ 640K</p>
          <p className="text-xs text-rose-500 mt-1">▼ From no-shows</p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: No-Show Risk ────────────────────────────────────────────────────────

function RiskBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

function PatientRiskCard({ p }: { p: NoShowPatient }) {
  const color = RISK_COLOR[p.risk_tier];
  return (
    <div className="rounded-xl border border-border bg-card p-3 hover:border-foreground/20 transition-colors cursor-default">
      <p className="text-sm font-medium text-foreground leading-tight">{p.patient_name}</p>
      <p className="text-xs text-muted-foreground mb-2">{p.appointment_time} · {p.department}</p>
      <RiskBar pct={p.risk_pct} color={color} />
      <div className="flex justify-between items-center mt-1">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${RISK_BG[p.risk_tier]}`}
        >
          {p.risk_tier.toUpperCase()} RISK
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">{p.risk_pct.toFixed(0)}%</span>
      </div>
      {p.risk_factors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {p.risk_factors.map((f) => (
            <span key={f} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function NoShowTab() {
  const { data: noshow, isLoading } = useNoShowRisk();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-medium text-foreground">Today's appointments — no-show risk</h3>
          <p className="text-xs text-muted-foreground">Sorted by risk score · Refreshes every 10 min</p>
        </div>
        {noshow && (
          <Badge variant="outline" className="text-[10px] font-mono border-purple-200 text-purple-600 bg-purple-50">
            {noshow.model_version.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Patient grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {noshow?.patients.map((p) => (
            <PatientRiskCard key={p.patient_id} p={p} />
          ))}
        </div>
      )}

      {/* Feature importance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Risk factor importance</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-200 text-emerald-700 bg-emerald-50">
              XGBOOST MODEL
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">What drives no-show predictions</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {noshow?.feature_importance.map((f) => (
                <div key={f.label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-44 truncate flex-shrink-0">{f.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${f.importance}%`, background: C.teal }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-muted-foreground w-8 text-right">
                    {f.importance}%
                  </span>
                </div>
              ))}
            </div>
          )}
          {noshow && (
            <p className="text-[11px] text-muted-foreground mt-3 italic">{noshow.accuracy_note}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function AIInsightsDashboard() {
  const [tab, setTab]       = useState<InsightsTab>("overview");
  const [period, setPeriod] = useState<Period>("30d");

  const periodLabel: Record<Period, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "1y": "This year",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: C.teal }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12M3.5 3.5l7 7M10.5 3.5l-7 7"
                    stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">
                AI Insights
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-mono ml-1 border-emerald-300 text-emerald-700 bg-emerald-50"
              >
                BETA
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Clinic performance · Revenue predictions · No-show risk
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {(Object.keys(periodLabel) as Period[]).map((p) => (
                <option key={p} value={p}>{periodLabel[p]}</option>
              ))}
            </select>
            <Badge variant="outline" className="text-[10px] font-mono hidden sm:flex">
              Model v2.4 · {new Date().toLocaleDateString("en-PK", { month: "short", day: "numeric" })}
            </Badge>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 border-b border-border pb-3">
          <TabBtn active={tab === "overview"} onClick={() => setTab("overview")}>
            📊 Overview
          </TabBtn>
          <TabBtn active={tab === "revenue"}  onClick={() => setTab("revenue")}>
            💰 Revenue AI
          </TabBtn>
          <TabBtn active={tab === "noshow"}   onClick={() => setTab("noshow")}>
            🔔 No-Show Risk
          </TabBtn>
        </div>

        {/* Tab content */}
        {tab === "overview" && <OverviewTab period={period} />}
        {tab === "revenue"  && <RevenueTab />}
        {tab === "noshow"   && <NoShowTab />}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
          <span>
            Last refreshed: {new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="italic">
            AI predictions are probabilistic. Always apply clinical judgment.
          </span>
        </div>
      </div>
    </div>
  );
}

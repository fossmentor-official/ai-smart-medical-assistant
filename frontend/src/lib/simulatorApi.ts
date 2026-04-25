import type { FacilityType } from "@/types/simulator"

type SimulatorEvent = "view" | "step_click" | "cta_click"

/**
 * Best-effort tracking. If no endpoint exists, we silently ignore.
 */
export async function trackSimulatorEvent(
  facility: FacilityType,
  role: string,
  event: SimulatorEvent
): Promise<void> {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

  try {
    await fetch(`${base}/api/simulator/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facility, role, event, ts: Date.now() }),
    })
  } catch {
    // no-op
  }
}


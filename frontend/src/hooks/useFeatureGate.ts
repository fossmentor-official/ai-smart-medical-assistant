// src/hooks/useFeatureGate.ts
// Per-user hourly rate gate. Keys are scoped to userId so different users
// on the same browser each get their own independent limits.

import { useState, useEffect, useCallback } from "react"
import { canUseFeature, recordFeatureUse, msUntilReset } from "../auth/AuthContext"
import { useAuth } from "../auth/AuthContext"

export type FeatureKey = "chat" | "live"

function fmt(ms: number): string {
  if (ms <= 0) return ""
  const s   = Math.ceil(ms / 1000)
  const min = Math.floor(s / 60)
  const sec = s % 60
  return `${min}m ${String(sec).padStart(2, "0")}s`
}

export function useFeatureGate(feature: FeatureKey) {
  const { user } = useAuth()
  const uid      = user?.id ?? "anonymous"

  const [available, setAvailable] = useState(() => canUseFeature(uid, feature))
  const [countdown, setCountdown] = useState(() => fmt(msUntilReset(uid, feature)))

  // Re-evaluate when user changes (e.g. login / logout)
  useEffect(() => {
    setAvailable(canUseFeature(uid, feature))
    setCountdown(fmt(msUntilReset(uid, feature)))
  }, [uid, feature])

  // Live countdown ticker when locked
  useEffect(() => {
    if (available) return
    const interval = setInterval(() => {
      const ok = canUseFeature(uid, feature)
      setAvailable(ok)
      setCountdown(ok ? "" : fmt(msUntilReset(uid, feature)))
      if (ok) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [available, uid, feature])

  const consume = useCallback(() => {
    recordFeatureUse(uid, feature)
    setAvailable(false)
    setCountdown(fmt(msUntilReset(uid, feature)))
  }, [uid, feature])

  return { available, countdown, consume }
}

// src/auth/AuthContext.tsx
// Real Supabase auth — email/password + Google + GitHub OAuth.
// User profiles stored in PostgreSQL (public.profiles table via trigger).
// Session persists across reloads via Supabase built-in localStorage.

import {
    createContext, useContext, useState, useEffect, useCallback, type ReactNode,
  } from "react"
  import { supabase } from "../lib/supabase"
  import type { Session, AuthError } from "@supabase/supabase-js"
  
  // ── Types ─────────────────────────────────────────────────────────────────────
  
  export interface User {
    id:       string
    email:    string
    name:     string
    avatar?:  string
    provider: "email" | "google" | "github"
  }
  
  export interface AuthContextValue {
    user:            User | null
    loading:         boolean
    authError:       string
    clearAuthError:  () => void
    login:           (email: string, password: string) => Promise<void>
    signup:          (email: string, password: string, name: string) => Promise<void>
    loginWithGoogle: () => Promise<void>
    loginWithGitHub: () => Promise<void>
    logout:          () => Promise<void>
  }
  
  // ── Context ───────────────────────────────────────────────────────────────────
  
  const AuthContext = createContext<AuthContextValue | null>(null)
  
  export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
    return ctx
  }
  
  // ── Rate-limit helpers — keyed by userId so limits are isolated per account ───
  
  const HOUR_MS = 60 * 60 * 1000
  
  export function canUseFeature(userId: string, featureKey: string): boolean {
    const raw = localStorage.getItem(`tc_${userId}_${featureKey}`)
    if (!raw) return true
    return Date.now() - parseInt(raw, 10) > HOUR_MS
  }
  
  export function recordFeatureUse(userId: string, featureKey: string) {
    localStorage.setItem(`tc_${userId}_${featureKey}`, String(Date.now()))
  }
  
  export function msUntilReset(userId: string, featureKey: string): number {
    const raw = localStorage.getItem(`tc_${userId}_${featureKey}`)
    if (!raw) return 0
    return Math.max(0, HOUR_MS - (Date.now() - parseInt(raw, 10)))
  }
  
  // ── Helpers ───────────────────────────────────────────────────────────────────
  
  function sessionToUser(session: Session): User {
    const meta     = session.user.user_metadata ?? {}
    const appMeta  = session.user.app_metadata  ?? {}
    const raw      = (appMeta.provider ?? "email") as string
    const provider: User["provider"] =
      raw === "google" ? "google" : raw === "github" ? "github" : "email"
    return {
      id:       session.user.id,
      email:    session.user.email ?? "",
      name:     meta.full_name ?? meta.name ?? session.user.email?.split("@")[0] ?? "User",
      avatar:   meta.avatar_url ?? meta.picture ?? undefined,
      provider,
    }
  }
  
  function friendlyMsg(err: AuthError | Error | unknown): string {
    const msg = (err as AuthError)?.message ?? String(err)
    if (msg.includes("Invalid login credentials"))  return "Incorrect email or password."
    if (msg.includes("Email not confirmed"))         return "Check your inbox and confirm your email first."
    if (msg.includes("User already registered"))     return "An account with this email already exists — log in instead."
    if (msg.includes("Password should be"))          return "Password must be at least 6 characters."
    if (msg.includes("rate limit"))                  return "Too many attempts. Wait a moment and try again."
    return msg
  }
  
  // ── Provider ──────────────────────────────────────────────────────────────────
  
  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user,      setUser]      = useState<User | null>(null)
    const [loading,   setLoading]   = useState(true)
    const [authError, setAuthError] = useState("")
  
    const clearAuthError = () => setAuthError("")
  
    useEffect(() => {
      // Restore existing session (also handles post-OAuth redirect)
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session ? sessionToUser(session) : null)
        setLoading(false)
      })
  
      // Keep in sync with Supabase auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session ? sessionToUser(session) : null)
        setLoading(false)
      })
  
      return () => subscription.unsubscribe()
    }, [])
  
    const login = useCallback(async (email: string, password: string) => {
      setAuthError("")
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(friendlyMsg(error))
    }, [])
  
    const signup = useCallback(async (email: string, password: string, name: string) => {
      setAuthError("")
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) throw new Error(friendlyMsg(error))
    }, [])
  
    const loginWithGoogle = useCallback(async () => {
      setAuthError("")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin, queryParams: { prompt: "select_account" } },
      })
      if (error) throw new Error(friendlyMsg(error))
    }, [])
  
    const loginWithGitHub = useCallback(async () => {
      setAuthError("")
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: window.location.origin },
      })
      if (error) throw new Error(friendlyMsg(error))
    }, [])
  
    const logout = useCallback(async () => {
      await supabase.auth.signOut()
    }, [])
  
    return (
      <AuthContext.Provider
        value={{ user, loading, authError, clearAuthError, login, signup, loginWithGoogle, loginWithGitHub, logout }}
      >
        {children}
      </AuthContext.Provider>
    )
  }
  
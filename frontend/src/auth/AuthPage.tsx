// src/auth/AuthPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// State-of-the-art auth page matching the dark medical aesthetic of TotalCura.
// Syne display font (already imported in index.css) + Inter for body.
// Framer-motion (already in package.json) drives all animations.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "./AuthContext"

// ── Icons (inline SVG — no extra dep) ────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )

// ── Floating particle background ──────────────────────────────────────────────

const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1 + Math.random() * 2.5,
  dur: 8 + Math.random() * 12,
  delay: Math.random() * -15,
}))

// ── Input field ───────────────────────────────────────────────────────────────

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  maxLength,
}: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  maxLength?: number
}) {
  const [showPw, setShowPw] = useState(false)
  const inputType = type === "password" ? (showPw ? "text" : "password") : type
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: type === "password" ? "11px 40px 11px 14px" : "11px 14px",
            fontSize: "14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#e2e8f0",
            outline: "none",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(56,189,248,0.5)"
            e.target.style.background = "rgba(255,255,255,0.08)"
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255,255,255,0.1)"
            e.target.style.background = "rgba(255,255,255,0.05)"
          }}
        />
        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center" }}
          >
            <EyeIcon open={showPw} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Social button ─────────────────────────────────────────────────────────────

function SocialBtn({
  icon,
  label,
  onClick,
  loading,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  loading: boolean
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "10px 14px",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "10px",
        background: "rgba(255,255,255,0.05)",
        color: "#cbd5e1",
        fontSize: "13px",
        fontWeight: 500,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.5 : 1,
        transition: "background 0.15s, border-color 0.15s",
        fontFamily: "inherit",
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"
        ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"
        ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"
      }}
    >
      {icon}
      {label}
    </motion.button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = "login" | "signup"

export default function AuthPage() {
  const { login, signup, loginWithGoogle, loginWithGitHub } = useAuth()
  const [tab, setTab] = useState<Tab>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [socialBusy, setSocialBusy] = useState<"google" | "github" | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const clearError = () => setError("")

  const handleSubmit = async () => {
    clearError()
    if (!email.trim()) return setError("Email is required.")
    if (!password || password.length < 6) return setError("Password must be at least 6 characters.")
    if (tab === "signup" && !name.trim()) return setError("Full name is required.")
    setBusy(true)
    try {
      if (tab === "login") await login(email, password)
      else await signup(email, password, name)
    } catch (e: unknown) {
      setError((e as Error).message ?? "Authentication failed. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleSocial = async (provider: "google" | "github") => {
    clearError()
    setSocialBusy(provider)
    try {
      if (provider === "google") await loginWithGoogle()
      else await loginWithGitHub()
    } catch {
      setError("Social login failed. Please try again.")
    } finally {
      setSocialBusy(null)
    }
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    setError("")
    setEmail("")
    setPassword("")
    setName("")
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#060e1a",
        overflow: "hidden",
        fontFamily: "'Geist Variable', 'Inter', sans-serif",
      }}
    >
      {/* ── Animated background ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {/* Radial glow blobs */}
        <div style={{ position: "absolute", top: "15%", left: "20%", width: "400px", height: "400px", borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "15%", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "600px", height: "300px", background: "radial-gradient(ellipse, rgba(6,182,212,0.05) 0%, transparent 70%)", filter: "blur(30px)" }} />

        {/* Grid lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04 }}>
          <defs>
            <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#38bdf8" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* Floating particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: "50%",
              background: "#38bdf8",
              opacity: 0.3,
            }}
            animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Left branding panel (desktop) ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 60px",
          maxWidth: "420px",
          flex: "0 0 auto",
          position: "relative",
          zIndex: 1,
        }}
        className="hidden lg:flex"
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "48px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "linear-gradient(135deg, #0ea5e9, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: "0 0 30px rgba(14,165,233,0.3)" }}>
            🏥
          </div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "22px", color: "#f1f5f9", letterSpacing: "-0.01em" }}>TotalCura</div>
            <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.1em" }}>AI CLINICAL INTELLIGENCE</div>
          </div>
        </div>

        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: "36px", color: "#f1f5f9", lineHeight: 1.15, marginBottom: "16px", letterSpacing: "-0.02em" }}>
          Clinical AI<br />
          <span style={{ background: "linear-gradient(90deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            at your fingertips
          </span>
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", lineHeight: 1.7, marginBottom: "40px" }}>
          Diagnose faster, document smarter, and streamline billing — all powered by Gemini AI and built for busy clinicians.
        </p>

        {/* Feature pills */}
        {[
          { icon: "🩺", text: "Clinical Assistant" },
          { icon: "🎙️", text: "Voice-to-EMR dictation" },
          { icon: "💰", text: "ICD-10 billing codes" },
          { icon: "📊", text: "Clinic analytics" },
        ].map((f) => (
          <motion.div
            key={f.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + ["🩺","🎙️","💰","📊"].indexOf(f.icon) * 0.1 }}
            style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", padding: "10px 14px", borderRadius: "10px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span style={{ fontSize: "16px" }}>{f.icon}</span>
            <span style={{ fontSize: "13px", color: "#94a3b8" }}>{f.text}</span>
            <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
          </motion.div>
        ))}
      </motion.div>

      {/* ── Auth card ── */}
      <motion.div
        ref={formRef}
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: "420px",
          margin: "24px",
          background: "rgba(13,22,37,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          padding: "36px",
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        {/* Card glow ring */}
        <div style={{ position: "absolute", inset: -1, borderRadius: "21px", background: "linear-gradient(135deg, rgba(56,189,248,0.15), rgba(99,102,241,0.1), transparent)", pointerEvents: "none", zIndex: -1 }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: "20px", color: "#f1f5f9", marginBottom: "4px" }}>
            {tab === "login" ? "Welcome back" : "Create account"}
          </div>
          <div style={{ fontSize: "13px", color: "#475569" }}>
            {tab === "login" ? "Sign in to your TotalCura account" : "Join TotalCura — free forever"}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: "12px", padding: "4px", marginBottom: "24px" }}>
          {(["login", "signup"] as Tab[]).map((t) => (
            <motion.button
              key={t}
              onClick={() => switchTab(t)}
              layout
              style={{
                flex: 1,
                padding: "9px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "9px",
                border: "none",
                cursor: "pointer",
                background: tab === t ? "#0ea5e9" : "transparent",
                color: tab === t ? "#fff" : "#475569",
                fontFamily: "inherit",
                transition: "color 0.2s",
              }}
            >
              {t === "login" ? "Log in" : "Sign up"}
            </motion.button>
          ))}
        </div>

        {/* Social login row */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <SocialBtn
            icon={<GoogleIcon />}
            label="Google"
            onClick={() => handleSocial("google")}
            loading={socialBusy === "google"}
          />
          <SocialBtn
            icon={<GitHubIcon />}
            label="GitHub"
            onClick={() => handleSocial("github")}
            loading={socialBusy === "github"}
          />
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: "11px", color: "#334155", letterSpacing: "0.05em" }}>OR</span>
          <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Form fields */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "signup" && (
              <Field label="Full name" type="text" value={name} onChange={(v) => { setName(v); clearError() }} placeholder="Dr. Sarah Khan" autoComplete="name" />
            )}
            <Field label="Email address" type="email" value={email} onChange={(v) => { setEmail(v); clearError() }} placeholder="you@hospital.com" autoComplete="email" />
            <Field label="Password" type="password" value={password} onChange={(v) => { setPassword(v); clearError() }} placeholder={tab === "signup" ? "Min. 6 characters" : "••••••••"} autoComplete={tab === "login" ? "current-password" : "new-password"} />
          </motion.div>
        </AnimatePresence>

        {/* Forgot password (login only) */}
        {tab === "login" && (
          <div style={{ textAlign: "right", marginTop: "-6px", marginBottom: "18px" }}>
            <button
              style={{ fontSize: "12px", color: "#38bdf8", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => alert("Password reset: integrate with Supabase auth.resetPasswordForEmail()")}
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: "14px" }}
            >
              <div style={{ padding: "10px 14px", borderRadius: "8px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", fontSize: "13px", color: "#fca5a5" }}>
                {error}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={busy}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: "10px",
            border: "none",
            background: busy ? "#1e3a4f" : "linear-gradient(135deg, #0ea5e9, #0284c7)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            boxShadow: busy ? "none" : "0 4px 20px rgba(14,165,233,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "background 0.2s, box-shadow 0.2s",
          }}
        >
          {busy ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}
              />
              {tab === "login" ? "Signing in…" : "Creating account…"}
            </>
          ) : (
            tab === "login" ? "Sign in →" : "Create account →"
          )}
        </motion.button>

        {/* Access tier info strip */}
        <div style={{ marginTop: "24px", padding: "14px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", color: "#334155", textTransform: "uppercase", marginBottom: "10px" }}>
            Free account includes
          </div>
          {[
            { dot: "#38bdf8", label: "Clinical chatbot", note: "1×/hr · 100 chars" },
            { dot: "#f59e0b", label: "Live recording", note: "1×/hr · 20 sec max" },
            { dot: "#22c55e", label: "Demo dictation", note: "Unlimited" },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "#64748b", flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: "11px", color: "#334155" }}>{item.note}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "20px", textAlign: "center", fontSize: "11px", color: "#334155" }}>
          By continuing you agree to TotalCura's{" "}
          <span style={{ color: "#38bdf8", cursor: "pointer" }}>Terms</span> &{" "}
          <span style={{ color: "#38bdf8", cursor: "pointer" }}>Privacy Policy</span>
        </div>
      </motion.div>
    </div>
  )
}

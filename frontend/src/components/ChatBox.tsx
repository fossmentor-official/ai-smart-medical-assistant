// frontend/src/components/ChatBox.tsx
// ─────────────────────────────────────────────────────────────────────────────
// ChatBox with:
//   • 100-character limit (enforced in UI + send guard)
//   • 1×/hour rate gate via useFeatureGate("chat")
//   • Live char counter with colour feedback
//   • Cooldown banner showing time-to-reset
//   • RCM mode: renders BillingRCM component, hides chat input
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react"
import { streamMessage } from "../lib/api"
import MessageBubble from "./MessageBubble"
import TypingIndicator from "./TypingIndicator"
import BillingRCM from "./BillingRCM"
import type { Message, Mode } from "../types/clinical"
import { MODES } from "../types/clinical"
import { Send, Clock } from "lucide-react"
import { useFeatureGate } from "../hooks/useFeatureGate"

const MAX_CHARS = 100

interface Props {
  mode: Mode
  pendingPrompt: { text: string; mode: Mode } | null
  onPendingClear: () => void
}

const HINTS: Record<Mode, string[]> = {
  clinical: ["Fever + cough 3 days", "Diabetic with high HbA1c", "Chest pain urgent"],
  billing:  ["ICD-10 for hypertension", "CPT for office visit 30m", "Diabetes billing codes"],
  docs:     ["SOAP note for flu patient", "Discharge summary diabetic", "Referral to cardiologist"],
  insights: ["Optimize 45-patient OPD", "Reduce patient wait times", "No-show pattern analysis"],
  rcm:      ["Diabetes follow-up visit", "ED chest pain workup", "Annual wellness visit"],
}

const modeBadgeClass: Record<Mode, string> = {
  clinical: "bg-blue-50 text-blue-700 border-blue-200",
  billing:  "bg-amber-50 text-amber-700 border-amber-200",
  docs:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  insights: "bg-purple-50 text-purple-700 border-purple-200",
  rcm:      "bg-emerald-50 text-emerald-700 border-emerald-200",
}

export default function ChatBox({ mode, pendingPrompt, onPendingClear }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText]         = useState("")
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)
  const currentMode             = MODES.find(m => m.id === mode)!

  const { available, countdown, consume } = useFeatureGate("chat")

  const charCount = text.length
  const overLimit = charCount > MAX_CHARS
  const nearLimit = charCount >= MAX_CHARS * 0.8

  // RCM mode has its own self-contained UI — no chat input needed
  const isRCMMode = mode === "rcm"

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  // Fire pending demo prompt — fixed race by using a ref flag
  const sendingRef = useRef(false)
  useEffect(() => {
    if (pendingPrompt && !sendingRef.current) {
      const { text: t, mode: m } = pendingPrompt
      onPendingClear()
      // Demo prompts bypass the 100-char limit (they are pre-built examples)
      sendWith(t, m, true)
    }
  }, [pendingPrompt])

  const sendWith = async (msg: string, m: Mode, isDemo = false) => {
    if (!msg.trim() || loading) return
    if (!isDemo && !available) return
    if (!isDemo && msg.length > MAX_CHARS) return

    sendingRef.current = true
    const userMsg: Message = { role: "user", text: msg, mode: m }
    const aiMsg:   Message = { role: "ai",   text: "",  mode: m }
    setMessages(prev => [...prev, userMsg, aiMsg])
    setText("")
    setLoading(true)

    if (!isDemo) consume() // record usage timestamp

    let accumulated = ""
    try {
      await streamMessage(msg, m, (chunk) => {
        accumulated += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "ai", text: accumulated, mode: m }
          return updated
        })
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Connection error."
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "ai",
          text: `{"type":"error","message":"${errMsg} Please try again."}`,
          mode: m,
        }
        return updated
      })
    } finally {
      setLoading(false)
      sendingRef.current = false
    }
  }

  const handleSend = () => sendWith(text, mode)

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 120) + "px"
  }

  const charColor =
    overLimit ? "text-red-500" :
    nearLimit ? "text-amber-500" :
    "text-slate-400"

  const charBg =
    overLimit ? "bg-red-50 border-red-200" :
    nearLimit ? "bg-amber-50 border-amber-200" :
    ""

  return (
    <div className="flex flex-col bg-slate-50" style={{ height: "100vh" }}>

      {/* ── Mode header — always visible ── */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">{currentMode.icon}</span>
          <div>
            <h1 className="font-display font-bold text-slate-900 text-base leading-none">
              {currentMode.label}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">{currentMode.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-md border tracking-wide ${modeBadgeClass[mode]}`}
          >
            {currentMode.badge}
          </span>
          {available ? (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AI Online
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <Clock size={10} />
              Resets in {countdown}
            </div>
          )}
        </div>
      </div>

      {/* ── RCM mode: full-page BillingRCM component ── */}
      {isRCMMode && (
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <BillingRCM />
        </div>
      )}

      {/* ── All other modes: standard chat UI ── */}
      {!isRCMMode && (
        <>
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-3xl shadow-xl shadow-blue-200">
                  {currentMode.icon}
                </div>
                <div>
                  <h2 className="font-display font-bold text-slate-800 text-xl">
                    {currentMode.label}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1.5 max-w-sm leading-relaxed">
                    Type a query (max 100 chars) or click a demo case in the sidebar
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {HINTS[mode].map((h) => (
                    <button
                      key={h}
                      onClick={() => { setText(h); textareaRef.current?.focus() }}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <MessageBubble key={i} role={m.role} text={m.text} mode={m.mode} />
            ))}

            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* ── Cooldown banner ── */}
          {!available && (
            <div className="flex-shrink-0 mx-4 mb-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
              <Clock size={14} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-semibold text-amber-700">
                  Usage limit reached
                </span>
                <span className="text-[12px] text-amber-600 ml-1.5">
                  Clinical chatbot resets in {countdown}
                </span>
              </div>
              <span className="text-[10px] text-amber-500 font-medium border border-amber-300 rounded-full px-2 py-0.5">
                1×/hr
              </span>
            </div>
          )}

          {/* ── Chat input ── */}
          <div className="border-t border-slate-200 bg-white px-4 py-3 flex-shrink-0">
            <div className="max-w-4xl mx-auto flex items-end gap-3">
              <div
                className={`flex-1 flex items-end gap-2 rounded-2xl border bg-slate-50 px-4 py-2.5 transition-all ${
                  overLimit
                    ? "border-red-300 ring-2 ring-red-100"
                    : "border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100"
                }`}
              >
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={text}
                  disabled={!available}
                  onChange={e => {
                    setText(e.target.value)
                    autoResize(e.target)
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder={
                    !available
                      ? `⏳ Cooldown active — resets in ${countdown}`
                      : `${currentMode.icon}  ${
                          mode === "clinical" ? "Describe patient symptoms… (max 100 chars)" :
                          mode === "billing"  ? "Describe visit for billing codes… (max 100 chars)" :
                          mode === "docs"     ? "Describe patient case… (max 100 chars)" :
                                               "Describe your clinic situation… (max 100 chars)"
                        }`
                  }
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder-slate-400 max-h-[120px] disabled:cursor-not-allowed disabled:opacity-50"
                />

                {/* Char counter */}
                <div
                  className={`text-[11px] font-mono font-semibold flex-shrink-0 self-end pb-0.5 transition-colors ${charColor} ${
                    charBg ? `px-1.5 py-0.5 rounded border ${charBg}` : ""
                  }`}
                >
                  {charCount}/{MAX_CHARS}
                </div>
              </div>

              <button
                onClick={handleSend}
                disabled={loading || !text.trim() || overLimit || !available}
                className="w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white shadow-lg shadow-blue-200 transition-all active:scale-95 flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>

            {/* Over-limit warning */}
            {overLimit && (
              <p className="text-center text-[11px] text-red-500 mt-1 font-medium">
                Message too long — please keep it under {MAX_CHARS} characters
              </p>
            )}

            <p className="text-center text-[10px] text-slate-400 mt-1.5">
              AI-assisted only · Not a substitute for clinical judgment · Always verify with a qualified physician
            </p>
          </div>
        </>
      )}

    </div>
  )
}
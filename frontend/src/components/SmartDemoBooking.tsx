// src/components/SmartDemoBooking.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Smart Demo Booking — AI-Powered
// A conversational intake that collects clinic profile → AI recommends package
// → contact form → confirmation.
//
// Design: dark glass-morphism matching TotalCura's #0d1625 palette.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Send, Sparkles, CheckCircle2, ChevronRight, Star } from "lucide-react"
import { sendBookingMessage, fetchRecommendation, confirmBooking } from "@/lib/bookingApi"
import type {
  ChatMessage,
  ClinicProfile,
  Package,
  RecommendResponse,
  BookingStep,
} from "@/types/booking"

// ─── Prop types ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

// ─── Quick-reply chip sets per conversation stage ─────────────────────────────

const CLINIC_TYPE_CHIPS = [
  "General Practice / Family clinic",
  "Specialty clinic",
  "Multi-doctor hospital",
  "Telemedicine / Online-only",
]

const DOCTOR_COUNT_CHIPS = [
  "Solo (1 doctor)",
  "Small team (2–5)",
  "Medium (6–15)",
  "Large (16+)",
]

const CHALLENGE_CHIPS = [
  "Documentation takes too long",
  "High no-show & cancellation rate",
  "Billing & claim rejections",
  "Staff coordination chaos",
]

// Which chips to show after which AI turn (0-indexed)
const CHIP_MAP: Record<number, string[]> = {
  0: CLINIC_TYPE_CHIPS,
  1: DOCTOR_COUNT_CHIPS,
  2: CHALLENGE_CHIPS,
}

// ─── Package tag styling ──────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
  recommended: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30",
  alternative:  "bg-slate-500/20 text-slate-400 border border-slate-500/20",
  enterprise:   "bg-violet-500/15 text-violet-300 border border-violet-500/30",
}
const TAG_LABELS: Record<string, string> = {
  recommended: "★ Recommended for you",
  alternative:  "Also available",
  enterprise:   "Enterprise",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <Sparkles size={12} className="text-cyan-400" />
      </div>
      <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/10">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  )
}

function AiBubble({ text }: { text: string }) {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <Sparkles size={12} className="text-cyan-400" />
      </div>
      <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/10 text-[13px] text-slate-200 leading-relaxed">
        {text}
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-br-sm bg-gradient-to-br from-cyan-500/80 to-blue-600/80 text-[13px] text-white leading-relaxed font-medium">
        {text}
      </div>
    </div>
  )
}

function QuickChips({
  chips,
  onSelect,
}: {
  chips: string[]
  onSelect: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 pl-9 mt-1">
      {chips.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="px-3 py-1.5 rounded-full text-[11px] font-medium border border-white/15 text-slate-300 bg-white/[0.04] hover:bg-cyan-500/15 hover:border-cyan-500/40 hover:text-cyan-300 transition-all duration-150"
        >
          {c}
        </button>
      ))}
    </div>
  )
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: Package
  selected: boolean
  onSelect: () => void
}) {
  const isRec = pkg.tag === "recommended"
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
        selected
          ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_24px_rgba(6,182,212,0.12)]"
          : isRec
          ? "border-cyan-500/30 bg-white/[0.04] hover:border-cyan-400/50 hover:bg-cyan-500/8"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      {/* Tag + name row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-white">{pkg.name}</span>
        <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium ${TAG_STYLES[pkg.tag]}`}>
          {TAG_LABELS[pkg.tag]}
        </span>
      </div>

      {/* Headline */}
      <p className="text-[12px] text-slate-400 mb-3 leading-snug">{pkg.headline}</p>

      {/* Features */}
      <ul className="space-y-1.5 mb-3">
        {pkg.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[11px] text-slate-300">
            <span className="mt-0.5 w-3 h-3 rounded-full border border-cyan-500/50 bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {/* Price + selection indicator */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500 font-mono">{pkg.price_hint}</span>
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
          selected ? "border-cyan-400 bg-cyan-400" : "border-white/20"
        }`}>
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#0d1625]" />}
        </div>
      </div>
    </button>
  )
}

function DemoAgendaItem({ text, index }: { text: string; index: number }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[9px] font-bold text-cyan-400">{index + 1}</span>
      </div>
      <p className="text-[12px] text-slate-300 leading-snug">{text}</p>
    </div>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS: { id: BookingStep; label: string }[] = [
  { id: "chat",           label: "Tell us" },
  { id: "recommendation", label: "Your plan" },
  { id: "contact",        label: "Book it" },
  { id: "confirmed",      label: "Done" },
]

function StepBar({ current }: { current: BookingStep }) {
  const idx = STEPS.findIndex((s) => s.id === current)
  return (
    <div className="flex items-center gap-0 mb-5">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
              i < idx
                ? "bg-cyan-500 text-white"
                : i === idx
                ? "bg-cyan-500/20 border-2 border-cyan-400 text-cyan-400"
                : "bg-white/5 border border-white/15 text-slate-600"
            }`}>
              {i < idx ? <CheckCircle2 size={12} /> : i + 1}
            </div>
            <span className={`text-[9px] font-medium hidden sm:block ${
              i === idx ? "text-cyan-400" : i < idx ? "text-slate-400" : "text-slate-700"
            }`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-1 mb-4 transition-all duration-500 ${
              i < idx ? "bg-cyan-500/50" : "bg-white/10"
            }`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartDemoBooking({ open, onClose }: Props) {
  // ── State ──
  const [step, setStep]                   = useState<BookingStep>("chat")
  const [messages, setMessages]           = useState<ChatMessage[]>([])
  const [displayItems, setDisplayItems]   = useState<Array<{ type: "ai" | "user" | "typing" | "chips"; text?: string; chips?: string[]; id: string }>>([])
  const [inputVal, setInputVal]           = useState("")
  const [isTyping, setIsTyping]           = useState(false)
  const [aiTurn, setAiTurn]               = useState(0)          // how many AI replies sent
  const [profile, setProfile]             = useState<Partial<ClinicProfile>>({})
  const [recommendation, setRecommendation] = useState<RecommendResponse | null>(null)
  const [selectedPkg, setSelectedPkg]     = useState<string>("")
  const [contactName, setContactName]     = useState("")
  const [contactEmail, setContactEmail]   = useState("")
  const [bookingRef, setBookingRef]       = useState("")
  const [error, setError]                 = useState("")
  const [submitting, setSubmitting]       = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const initialized = useRef(false)

  // ── Helpers ──

  const uid = () => Math.random().toString(36).slice(2)

  const pushDisplay = useCallback(
    (item: (typeof displayItems)[0]) =>
      setDisplayItems((prev) => [...prev, item]),
    []
  )

  const removeTypingIndicator = useCallback(
    () => setDisplayItems((prev) => prev.filter((i) => i.type !== "typing")),
    []
  )

  const scrollBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80)

  // ── Boot: send first AI greeting ──

  useEffect(() => {
    if (!open) return
    if (initialized.current) return
    initialized.current = true

    // Reset everything on open
    setStep("chat")
    setMessages([])
    setDisplayItems([])
    setAiTurn(0)
    setProfile({})
    setRecommendation(null)
    setSelectedPkg("")
    setContactName("")
    setContactEmail("")
    setBookingRef("")
    setError("")

    // Show greeting after short delay
    setTimeout(() => {
      pushDisplay({
        type: "ai",
        text: "Hi! I'm your TotalCura guide. To craft the perfect demo for you, what type of clinic do you run?",
        id: uid(),
      })
      pushDisplay({ type: "chips", chips: CLINIC_TYPE_CHIPS, id: uid() })
      scrollBottom()
    }, 400)
  }, [open, pushDisplay])

  // ── Close reset ──

  const handleClose = () => {
    initialized.current = false
    onClose()
  }

  // ── Send a user message ──

  const handleSend = useCallback(
    async (text?: string) => {
      const value = (text ?? inputVal).trim()
      if (!value || isTyping) return
      setInputVal("")
      setError("")

      // Add to display
      setDisplayItems((prev) => [
        ...prev.filter((i) => i.type !== "chips"),  // remove pending chips
        { type: "user", text: value, id: uid() },
      ])
      scrollBottom()

      // Add to history
      const nextHistory: ChatMessage[] = [
        ...messages,
        { role: "user", content: value },
      ]
      setMessages(nextHistory)

      // Show typing
      setIsTyping(true)
      pushDisplay({ type: "typing", id: "typing" })
      scrollBottom()

      try {
        const res = await sendBookingMessage(messages, value)

        // Merge collected profile
        setProfile((prev) => ({
          ...prev,
          ...(res.collected.clinic_type && { clinic_type: res.collected.clinic_type }),
          ...(res.collected.doctor_count && { doctor_count: res.collected.doctor_count }),
          ...(res.collected.top_challenge && { top_challenge: res.collected.top_challenge }),
        }))

        // Update history with AI reply
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.reply },
        ])

        removeTypingIndicator()
        setIsTyping(false)

        pushDisplay({ type: "ai", text: res.reply, id: uid() })
        scrollBottom()

        const nextTurn = aiTurn + 1
        setAiTurn(nextTurn)

        if (res.is_complete) {
          // Transition to recommendation
          setTimeout(() => triggerRecommendation(res.collected as ClinicProfile), 600)
        } else if (CHIP_MAP[nextTurn]) {
          pushDisplay({ type: "chips", chips: CHIP_MAP[nextTurn], id: uid() })
          scrollBottom()
        }
      } catch {
        removeTypingIndicator()
        setIsTyping(false)
        setError("Connection issue — please try again.")
      }
    },
    [inputVal, isTyping, messages, aiTurn, pushDisplay, removeTypingIndicator]
  )

  // ── Fetch recommendation ──

  const triggerRecommendation = async (collectedProfile: ClinicProfile) => {
    setStep("recommendation")
    setIsTyping(true)
    pushDisplay({ type: "typing", id: "typing" })
    scrollBottom()

    try {
      const rec = await fetchRecommendation({
        clinic_type:    collectedProfile.clinic_type   || profile.clinic_type    || "",
        doctor_count:   collectedProfile.doctor_count  || profile.doctor_count   || "",
        top_challenge:  collectedProfile.top_challenge || profile.top_challenge  || "",
      })
      setRecommendation(rec)
      setSelectedPkg(rec.packages[0]?.name ?? "")
      removeTypingIndicator()
      setIsTyping(false)
      scrollBottom()
    } catch {
      removeTypingIndicator()
      setIsTyping(false)
      setError("Could not load recommendation — please try again.")
    }
  }

  // ── Confirm booking ──

  const handleConfirm = async () => {
    if (!contactName.trim() || !contactEmail.trim()) {
      setError("Please fill in your name and email.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      setError("Please enter a valid email address.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await confirmBooking({
        profile: {
          clinic_type:   profile.clinic_type   || "",
          doctor_count:  profile.doctor_count  || "",
          top_challenge: profile.top_challenge || "",
        },
        chosen_package: selectedPkg,
        contact_name:   contactName,
        contact_email:  contactEmail,
      })
      setBookingRef(res.booking_ref)
      setStep("confirmed")
    } catch {
      setError("Booking failed — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Scroll on display update ──

  useEffect(() => {
    scrollBottom()
  }, [displayItems])

  if (!open) return null

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(4,8,18,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Dialog */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl border border-white/10 overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0d1625 0%, #0a111e 100%)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08)",
        }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Sparkles size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-white leading-none">Book a Demo</p>
                <p className="text-[10px] text-slate-500 mt-0.5">AI-powered · Takes 60 seconds</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X size={14} className="text-slate-400" />
            </button>
          </div>
          <StepBar current={step} />
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── STEP: CHAT ── */}
          {step === "chat" && (
            <div className="px-5 py-4 space-y-3">
              {displayItems.map((item) => {
                if (item.type === "ai")     return <AiBubble    key={item.id} text={item.text!} />
                if (item.type === "user")   return <UserBubble  key={item.id} text={item.text!} />
                if (item.type === "typing") return <TypingIndicator key="typing" />
                if (item.type === "chips")  return (
                  <QuickChips
                    key={item.id}
                    chips={item.chips!}
                    onSelect={(v) => handleSend(v)}
                  />
                )
                return null
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* ── STEP: RECOMMENDATION ── */}
          {step === "recommendation" && (
            <div className="px-5 py-4">
              {isTyping && !recommendation ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <Sparkles size={18} className="text-cyan-400 animate-pulse" />
                  </div>
                  <p className="text-[12px] text-slate-500">Crafting your personalised plan…</p>
                </div>
              ) : recommendation ? (
                <div className="space-y-4">
                  {/* Personalised pitch */}
                  <div className="px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-600/5 border border-cyan-500/20">
                    <p className="text-[12px] text-cyan-300 leading-relaxed">
                      {recommendation.personalised_pitch}
                    </p>
                  </div>

                  {/* Package cards */}
                  <div className="space-y-3">
                    {recommendation.packages.map((pkg) => (
                      <PackageCard
                        key={pkg.name}
                        pkg={pkg}
                        selected={selectedPkg === pkg.name}
                        onSelect={() => setSelectedPkg(pkg.name)}
                      />
                    ))}
                  </div>

                  {/* Demo agenda */}
                  {recommendation.demo_agenda.length > 0 && (
                    <div className="px-4 py-3 rounded-2xl border border-white/8 bg-white/[0.02]">
                      <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mb-3">
                        Your demo will cover
                      </p>
                      <div className="space-y-2">
                        {recommendation.demo_agenda.map((item, i) => (
                          <DemoAgendaItem key={i} text={item} index={i} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* ── STEP: CONTACT ── */}
          {step === "contact" && (
            <div className="px-5 py-6 space-y-4">
              <div>
                <p className="text-[15px] font-semibold text-white mb-1">Almost there</p>
                <p className="text-[12px] text-slate-500">
                  We'll send your personalised demo invite to your inbox.
                </p>
              </div>

              {/* Selected package reminder */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
                <Star size={11} className="text-cyan-400 flex-shrink-0" />
                <p className="text-[11px] text-cyan-300 font-medium">{selectedPkg}</p>
              </div>

              {/* Form fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1.5 block font-medium">
                    Your name
                  </label>
                  <input
                    type="text"
                    placeholder="Dr. Ahmed Khan"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:bg-white/[0.08] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1.5 block font-medium">
                    Work email
                  </label>
                  <input
                    type="email"
                    placeholder="ahmed@yourclinic.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 focus:bg-white/[0.08] transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: CONFIRMED ── */}
          {step === "confirmed" && (
            <div className="px-5 py-10 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[17px] font-bold text-white mb-1">Demo confirmed!</p>
                <p className="text-[12px] text-slate-400 leading-relaxed max-w-xs">
                  We're preparing a personalised TotalCura demo for your clinic.
                  Check your inbox for next steps.
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 font-mono text-[12px] text-slate-400">
                Ref: <span className="text-cyan-400 font-semibold">{bookingRef}</span>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] text-slate-300 hover:bg-white/10 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* ── Error bar ── */}
        {error && (
          <div className="flex-shrink-0 mx-5 mb-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-[12px] text-red-400">
            {error}
          </div>
        )}

        {/* ── Footer / actions ── */}
        <div className="flex-shrink-0 border-t border-white/8">

          {/* Chat input */}
          {step === "chat" && (
            <div className="flex items-center gap-2 px-4 py-3">
              <input
                ref={inputRef}
                type="text"
                placeholder="Or type your answer…"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isTyping}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/12 text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 disabled:opacity-40 transition-all"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputVal.trim() || isTyping}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 disabled:opacity-30 hover:opacity-90 transition-all active:scale-95"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          )}

          {/* Recommendation → proceed */}
          {step === "recommendation" && recommendation && (
            <div className="px-5 py-3">
              <button
                onClick={() => setStep("contact")}
                disabled={!selectedPkg}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-[13px] font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-all active:scale-[0.98]"
              >
                Book my personalised demo
                <ChevronRight size={15} />
              </button>
              <p className="text-center text-[10px] text-slate-600 mt-1.5">
                No commitment · Cancel any time
              </p>
            </div>
          )}

          {/* Contact → confirm */}
          {step === "contact" && (
            <div className="px-5 py-3">
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-[13px] font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-all active:scale-[0.98]"
              >
                {submitting ? "Booking…" : "Confirm my demo →"}
              </button>
              <button
                onClick={() => setStep("recommendation")}
                className="w-full text-center text-[11px] text-slate-600 hover:text-slate-400 mt-2 transition-colors"
              >
                ← Back to packages
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

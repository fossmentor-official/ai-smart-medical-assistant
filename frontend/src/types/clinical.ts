export type Mode = "clinical" | "billing" | "docs" | "insights"

export interface Message {
  role: "user" | "ai"
  text: string
  mode: Mode
}

export interface ClinicalResponse {
  type: "clinical"
  summary: string
  possible_diagnosis: string[]
  risk_level: "low" | "medium" | "high"
  risk_score: number
  recommended_tests: string[]
  treatment_plan: string[]
  medications: string[]
  soap_notes: {
    subjective: string
    objective: string
    assessment: string
    plan: string
  }
  when_to_refer: string | null
  confidence: number
}

export interface BillingResponse {
  type: "billing"
  summary: string
  icd10_codes: { code: string; description: string }[]
  cpt_codes: { code: string; description: string }[]
  estimated_reimbursement: string
  denial_risks: string[]
  optimization_tips: string[]
}

export interface DocsResponse {
  type: "docs"
  document_type: string
  content: string
  follow_up: string
}

export interface InsightsResponse {
  type: "insights"
  summary: string
  key_metrics: { label: string; value: string; trend: "up" | "down" | "flat" }[]
  recommendations: string[]
  projected_improvement: string
}

export type AIResponse = ClinicalResponse | BillingResponse | DocsResponse | InsightsResponse

export const MODES: { id: Mode; label: string; icon: string; desc: string; badge: string; color: string }[] = [
  { id: "clinical",  label: "Clinical Assistant", icon: "🩺", desc: "Diagnosis & SOAP notes",  badge: "CLINICAL",  color: "blue"   },
  { id: "billing",   label: "Billing Assistant",  icon: "💰", desc: "ICD codes & claims",      badge: "BILLING",   color: "amber"  },
  { id: "docs",      label: "Documentation AI",   icon: "📄", desc: "Auto EMR notes",          badge: "DOCS",      color: "emerald"},
  { id: "insights",  label: "Clinic Insights",    icon: "📊", desc: "Analytics & trends",      badge: "INSIGHTS",  color: "purple" },
]

export const DEMO_CASES: { label: string; icon: string; sub: string; prompt: string; mode: Mode }[] = [
  {
    label: "Fever + Cough",
    icon: "🌡️",
    sub: "Adult · 3 days · Moderate",
    mode: "clinical",
    prompt: "Patient: 34-year-old female. Fever 38.9°C, dry cough, fatigue, mild shortness of breath for 3 days. No travel history. No known allergies."
  },
  {
    label: "Diabetes Follow-up",
    icon: "🩸",
    sub: "Type 2 · HbA1c 9.2%",
    mode: "clinical",
    prompt: "Patient: 58-year-old male. Known Type 2 Diabetes. HbA1c: 9.2%. On Metformin 1000mg BD. Complaints: fatigue, increased thirst, blurred vision for 2 weeks."
  },
  {
    label: "Chest Pain",
    icon: "💔",
    sub: "Acute · Urgent referral",
    mode: "clinical",
    prompt: "URGENT: 55-year-old male. Acute crushing chest pain 8/10, radiating to left arm and jaw, with sweating and nausea. Started 45 minutes ago. History of hypertension."
  },
  {
    label: "ICD-10 Coding",
    icon: "🔢",
    sub: "Hypertension + CKD",
    mode: "billing",
    prompt: "Generate ICD-10 and CPT codes for a patient with hypertension stage 2 with chronic kidney disease stage 3, receiving an office consultation."
  },
]
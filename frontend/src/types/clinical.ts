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
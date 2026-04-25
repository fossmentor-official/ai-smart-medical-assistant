export type FacilityType = "clinic" | "urgent_care" | "radiology"

export interface WorkflowStep {
  tag: string
  title: string
  desc: string
  aiOutput: string
  timingNote: string
}

export interface RolePersona {
  name: string
  role: string
  icon: string
}

export interface RoleMetric {
  primary: string
  primaryLabel: string
}


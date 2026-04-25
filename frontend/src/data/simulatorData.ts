import type { FacilityType, RoleMetric, RolePersona, WorkflowStep } from "@/types/simulator"

export const FACILITIES: Array<{
  id: FacilityType
  label: string
  sub: string
  icon: string
}> = [
  { id: "clinic", label: "Clinic", sub: "Primary care + specialists", icon: "🏥" },
  { id: "urgent_care", label: "Urgent care", sub: "Walk-ins + triage", icon: "🚑" },
  { id: "radiology", label: "Radiology", sub: "Imaging + reporting", icon: "🩻" },
]

type RoleData = {
  persona: RolePersona
  steps: WorkflowStep[]
  metric: RoleMetric
}

type FacilitySimulatorData = {
  roles: string[]
  roleData: Record<string, RoleData>
}

export const SIMULATOR_DATA: Record<FacilityType, FacilitySimulatorData> = {
  clinic: {
    roles: ["Doctor", "Nurse", "Front Desk"],
    roleData: {
      Doctor: {
        persona: { name: "Dr. Patel", role: "Primary Care Physician", icon: "🩺" },
        metric: { primary: "32%", primaryLabel: "more patients/day" },
        steps: [
          {
            tag: "Intake",
            title: "Pre-visit summary auto-built",
            desc: "AI pulls the chart, meds, problem list, and recent labs into a focused brief.",
            aiOutput: "Pre-visit brief: HTN, T2DM. Last A1c 7.4 (3 mo). Med adherence noted. Flag: overdue eye exam.",
            timingNote: "0:18 saved vs manual chart review",
          },
          {
            tag: "During visit",
            title: "Real-time note drafting",
            desc: "AI drafts a structured SOAP note as you speak and updates as the plan evolves.",
            aiOutput: "SOAP draft updated: Assessment—viral URI likely. Plan—supportive care, return precautions, follow-up PRN.",
            timingNote: "2–4 min saved per encounter",
          },
          {
            tag: "Orders",
            title: "Smart orders + coding suggestions",
            desc: "AI proposes orders and CPT/ICD candidates based on documentation.",
            aiOutput: "Suggested codes: J06.9, R05.9. Consider CPT 99213 (MDM moderate).",
            timingNote: "Fewer denials; faster claims",
          },
        ],
      },
      Nurse: {
        persona: { name: "Morgan", role: "Clinic Nurse", icon: "💉" },
        metric: { primary: "45 min", primaryLabel: "saved per shift" },
        steps: [
          {
            tag: "Rooming",
            title: "Vitals + history captured faster",
            desc: "AI suggests key ROS questions based on chief complaint and prior history.",
            aiOutput: "Suggested ROS prompts: fever, SOB, chest pain, sick contacts; recent BP trends highlighted.",
            timingNote: "30–60 sec saved per patient",
          },
          {
            tag: "Coordination",
            title: "Referrals and tasks generated",
            desc: "AI turns plans into actionable tasks (labs, referrals, patient instructions).",
            aiOutput: "Tasks drafted: schedule A1c, eye exam referral, patient portal instructions.",
            timingNote: "Less back-and-forth",
          },
        ],
      },
      "Front Desk": {
        persona: { name: "Avery", role: "Front Desk", icon: "🗓️" },
        metric: { primary: "18%", primaryLabel: "fewer no-shows" },
        steps: [
          {
            tag: "Scheduling",
            title: "Appointment intent understood",
            desc: "AI classifies request urgency and finds the right visit type/time slot.",
            aiOutput: "Request: 'knee pain' → visit type: MSK eval. Suggested slot: 20 min, within 7 days.",
            timingNote: "Faster scheduling decisions",
          },
          {
            tag: "Reminders",
            title: "Personalized reminders auto-sent",
            desc: "AI generates reminders tailored to visit type and patient behavior.",
            aiOutput: "Reminder: bring imaging, arrive 10 min early for forms; SMS + email scheduled.",
            timingNote: "Improves attendance",
          },
        ],
      },
    },
  },

  urgent_care: {
    roles: ["Clinician", "Triage Nurse"],
    roleData: {
      Clinician: {
        persona: { name: "Dr. Nguyen", role: "Urgent Care Clinician", icon: "⚕️" },
        metric: { primary: "12 min", primaryLabel: "avg time saved/visit" },
        steps: [
          {
            tag: "Triage",
            title: "Risk flags highlighted",
            desc: "AI surfaces red flags from symptoms and vitals immediately.",
            aiOutput: "Flag: tachycardia + pleuritic pain → consider PE rule-out; suggest Wells/PERC prompts.",
            timingNote: "Faster escalation",
          },
          {
            tag: "Discharge",
            title: "Instructions generated automatically",
            desc: "AI drafts clear discharge instructions and return precautions.",
            aiOutput: "Return precautions: worsening SOB, chest pain, persistent fever >72h; hydration + OTC guidance.",
            timingNote: "Consistent patient education",
          },
        ],
      },
      "Triage Nurse": {
        persona: { name: "Jordan", role: "Triage Nurse", icon: "🧭" },
        metric: { primary: "25%", primaryLabel: "faster triage" },
        steps: [
          {
            tag: "Intake",
            title: "Chief complaint structured",
            desc: "AI converts free-text complaints into structured fields.",
            aiOutput: "CC: sore throat x2d, odynophagia, no cough. Vitals stable. Centor prompts suggested.",
            timingNote: "Less rework for clinician",
          },
        ],
      },
    },
  },

  radiology: {
    roles: ["Radiologist", "Technologist"],
    roleData: {
      Radiologist: {
        persona: { name: "Dr. Chen", role: "Radiologist", icon: "🩻" },
        metric: { primary: "3×", primaryLabel: "report throughput" },
        steps: [
          {
            tag: "Reading",
            title: "Findings summarized",
            desc: "AI drafts a structured report outline from key findings you dictate.",
            aiOutput: "Impression draft: No acute intracranial hemorrhage. Mild chronic microvascular changes.",
            timingNote: "Faster report finalization",
          },
          {
            tag: "Follow-up",
            title: "Critical results workflow",
            desc: "AI proposes critical result notifications and documents communication.",
            aiOutput: "Critical results note: communicated to ordering provider at 14:32; read-back confirmed.",
            timingNote: "Better compliance",
          },
        ],
      },
      Technologist: {
        persona: { name: "Sam", role: "Radiology Technologist", icon: "🧰" },
        metric: { primary: "20%", primaryLabel: "fewer repeats" },
        steps: [
          {
            tag: "Prep",
            title: "Protocol suggestions",
            desc: "AI suggests protocol adjustments based on indication and history.",
            aiOutput: "Indication: flank pain → CT A/P stone protocol; confirm contrast allergy status.",
            timingNote: "Fewer protocol misses",
          },
        ],
      },
    },
  },
}


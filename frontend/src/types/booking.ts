// src/types/booking.ts
// Mirrors booking_service.py Pydantic schemas exactly.

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface BookingChatResponse {
  reply: string;
  is_complete: boolean;
  collected: {
    clinic_type: string | null;
    doctor_count: string | null;
    top_challenge: string | null;
  };
}

export interface ClinicProfile {
  clinic_type: string;
  doctor_count: string;
  top_challenge: string;
  extra_notes?: string;
}

export type PackageTag = "recommended" | "alternative" | "enterprise";

export interface Package {
  name: string;
  tag: PackageTag;
  headline: string;
  features: string[];
  price_hint: string;
  cta: string;
}

export interface RecommendResponse {
  packages: Package[];
  personalised_pitch: string;
  demo_agenda: string[];
}

export interface BookingConfirmRequest {
  profile: ClinicProfile;
  chosen_package: string;
  contact_name: string;
  contact_email: string;
  preferred_slot?: string;
}

export interface BookingConfirmResponse {
  booking_ref: string;
  message: string;
}

// UI state
export type BookingStep =
  | "chat"           // AI intake conversation
  | "recommendation" // package cards shown
  | "contact"        // name + email form
  | "confirmed";     // success screen

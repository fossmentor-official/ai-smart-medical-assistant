// src/lib/bookingApi.ts

import type {
  ChatMessage,
  BookingChatResponse,
  ClinicProfile,
  RecommendResponse,
  BookingConfirmRequest,
  BookingConfirmResponse,
} from "@/types/booking";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[${res.status}] ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function sendBookingMessage(
  history: ChatMessage[],
  userMessage: string
): Promise<BookingChatResponse> {
  return post<BookingChatResponse>("/api/booking/chat", {
    history,
    user_message: userMessage,
  });
}

export async function fetchRecommendation(
  profile: ClinicProfile
): Promise<RecommendResponse> {
  return post<RecommendResponse>("/api/booking/recommend", { profile });
}

export async function confirmBooking(
  req: BookingConfirmRequest
): Promise<BookingConfirmResponse> {
  return post<BookingConfirmResponse>("/api/booking/confirm", req);
}

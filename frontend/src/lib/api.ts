import type { Mode } from "../types/clinical"

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

export async function streamMessage(
  message: string,
  mode: Mode,
  onChunk: (chunk: string) => void
): Promise<void> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode }),
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  const reader = res.body?.getReader()
  const decoder = new TextDecoder()
  if (!reader) return

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const lines = decoder.decode(value).split("\n")
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()
      if (data === "[DONE]") return
      try {
        const parsed = JSON.parse(data)
        if (parsed.text) onChunk(parsed.text)
        if (parsed.error) throw new Error(parsed.error)
      } catch {}
    }
  }
}
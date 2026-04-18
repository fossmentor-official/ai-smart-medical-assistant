import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef } from "react"
import { streamMessage } from "../lib/api"
import MessageBubble from "./MessageBubble"
import TypingIndicator from "./TypingIndicator"
import type { Message, Mode } from "../types/clinical"

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<Mode>("clinical")   // ← add mode state
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: "user", text, mode }
    const aiMsg: Message = { role: "ai", text: "", mode }
    setMessages((prev) => [...prev, userMsg, aiMsg])
    setText("")
    setLoading(true)
    let accumulated = ""
    try {
      await streamMessage(text, mode, (chunk) => {
        accumulated += chunk
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: "ai", text: accumulated, mode }
          return updated
        })
      })
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: "ai", text: "Error connecting to AI. Please try again.", mode }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full flex justify-center">
      <div className="w-full max-w-4xl flex flex-col h-full">

        {/* HEADER */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-semibold text-xl">
                🏥 Total Cura AI Assistant
              </h1>
              <p className="text-sm text-gray-500">
                Clinical intelligence system powered by AI
              </p>
            </div>

            <div className="text-xs px-3 py-1 rounded-full bg-green-500 text-white">
              AI Online
            </div>
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
              <div className="text-4xl mb-3">🧠</div>
              <h2 className="text-lg font-semibold text-gray-600">
                AI Medical Assistant
              </h2>
              <p className="text-sm mt-2 max-w-sm">
                Describe your symptoms and get instant AI-powered medical guidance
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} text={m.text} />
          ))}

          {loading && (
            <div className="text-sm text-gray-400 animate-pulse">
              AI is analyzing...
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* INPUT (STICKY LIKE CHATGPT) */}
        <div className="border-t bg-white/80 backdrop-blur px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">

            <input
              className="flex-1 rounded-full border px-4 py-2 text-sm bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe symptoms (e.g. fever, headache...)"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend()
              }}
            />

            <Button
              className="rounded-full px-5"
              onClick={handleSend}
            >
              Send
            </Button>

          </div>
        </div>

      </div>
    </div>
  )
}
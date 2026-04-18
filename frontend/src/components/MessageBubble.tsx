import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"

function parseAI(text: string) {
  // simple structuring (you can improve later with backend)
  return {
    raw: text
  }
}

export default function MessageBubble({ role, text }: any) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl max-w-[70%] text-sm shadow-sm">
          {text}
        </div>
      </div>
    )
  }

  const formattedText = text
  .replace(/##/g, "\n##")
  .replace(/\*/g, "")

  return (
    <div className="flex justify-start animate-in">
      <div className="max-w-[80%] p-4 rounded-2xl bg-white/80 backdrop-blur border shadow-sm space-y-3">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">
            🧠 AI Medical Analysis
          </span>
          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
            Safe Guidance
          </span>
        </div>

        {/* MARKDOWN CONTENT */}
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          <ReactMarkdown
            components={{
              h2: ({node, ...props}) => (
                <h2 className="text-sm font-semibold mt-4 mb-2" {...props} />
              ),
              li: ({node, ...props}) => (
                <li className="ml-4 list-disc mb-1" {...props} />
              ),
              p: ({node, ...props}) => (
                <p className="mb-2" {...props} />
              )
            }}
          >
            {formattedText}
          </ReactMarkdown>
        </div>

      </div>
    </div>
  )
}
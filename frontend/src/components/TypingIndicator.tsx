export default function TypingIndicator() {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400">AI is analyzing...</span>
      </div>
    )
  }
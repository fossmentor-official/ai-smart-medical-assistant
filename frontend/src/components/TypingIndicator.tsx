export default function TypingIndicator() {
  return (
    <div className="flex gap-3 items-center animate-fade-in">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-sm flex-shrink-0 shadow-md shadow-blue-100">
        🤖
      </div>
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-xs text-slate-400">Analyzing with clinical AI...</span>
      </div>
    </div>
  )
}
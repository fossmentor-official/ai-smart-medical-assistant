import { useState } from "react";

export default function InputBox({ onSend }: any) {
  const [text, setText] = useState("");

  return (
    <div className="flex gap-2 p-4 border-t">
      <input
        className="flex-1 border rounded-lg p-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Describe your symptoms..."
      />
      <button
        className="bg-blue-600 text-white px-4 rounded-lg"
        onClick={() => {
          onSend(text);
          setText("");
        }}
      >
        Send
      </button>
    </div>
  );
}
"use client";

import { useState, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  }

  return (
    <div className="border-t border-white/8 bg-[#0d1117]/80 px-6 py-4 backdrop-blur-sm">
      <div className={cn(
        "flex items-end gap-3 rounded-2xl border bg-white/4 px-4 py-3 transition-all duration-200",
        value ? "border-violet-500/40 shadow-lg shadow-violet-500/5" : "border-white/8"
      )}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="LibreLane projeni anlat... (⌘+Enter gönder)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none leading-relaxed"
          style={{ minHeight: "24px", maxHeight: "160px" }}
        />
        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200",
            value.trim() && !isLoading
              ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20 active:scale-95"
              : "bg-white/5 text-slate-600 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-slate-700">
        Mock mod — AI yanıtları simülasyondur
      </p>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Terminal as TerminalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceTerminalProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function WorkspaceTerminal({ collapsed, onToggleCollapsed }: WorkspaceTerminalProps) {
  const [lines, setLines] = useState<string[]>([
    "LibreLane workspace terminal — çıktılar burada görünecek.",
    "$ ",
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, collapsed]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;
    setLines((prev) => [...prev.slice(0, -1), `$ ${cmd}`, `→ (yerel önizleme) Komut kayıtlı: ${cmd}`, "$ "]);
    setInput("");
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex w-full items-center justify-center gap-2 border-t border-white/10 bg-[#1a1f26] py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:bg-white/5 hover:text-slate-400"
      >
        <TerminalIcon className="h-3 w-3" />
        Terminal — göster
        <ChevronUp className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="flex h-full min-h-[120px] flex-col border-t border-white/10 bg-[#1a1f26]">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#161b22] px-2 py-1">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <TerminalIcon className="h-3 w-3 text-emerald-500/80" />
          Terminal
        </div>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-slate-300"
          title="Paneli küçült"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden font-mono text-[11px] leading-relaxed">
        <div className="flex-1 overflow-y-auto p-2 text-slate-400">
          {lines.map((line, i) => (
            <div
              key={`${i}-${line.slice(0, 24)}`}
              className={cn(
                "whitespace-pre-wrap break-all",
                line.startsWith("$ ") && "text-slate-300",
                line.startsWith("→") && "text-slate-500"
              )}
            >
              {line}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSubmit} className="flex border-t border-white/8 bg-[#0d1117] px-2 py-1">
          <span className="select-none pr-1 text-emerald-600/90">$</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-600"
            placeholder="Komut (önizleme)"
            autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Cpu, User } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  projectName: string;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-[#0d1117]">
      {lang && (
        <div className="flex items-center border-b border-white/8 px-3 py-1">
          <span className="text-[10px] font-mono text-slate-500">{lang}</span>
        </div>
      )}
      <pre className="overflow-x-auto p-3 text-xs text-slate-300 leading-relaxed font-mono">{code}</pre>
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.slice(3, -3).split("\n");
          const lang = lines[0].trim();
          const code = lines.slice(1).join("\n").trim();
          return <CodeBlock key={i} code={code} lang={lang || undefined} />;
        }
        return (
          <p key={i} className="leading-relaxed whitespace-pre-wrap">
            {part}
          </p>
        );
      })}
    </>
  );
}

export default function MessageList({ messages, projectName }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/30">
          <Cpu className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">LibreLane Agent</h2>
          <p className="text-sm text-slate-500 max-w-md">
            <span className="font-medium text-slate-300">{projectName}</span> projesi için hazırım.
            Verilog tasarımı, sentez, simülasyon veya OpenLane konfigürasyonu hakkında soru sorabilirsin.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
          {[
            "UART kontrolcüsü yaz",
            "ALU sentez ayarları",
            "GTKWave simülasyonu",
            "OpenLane config.json",
          ].map((hint) => (
            <div
              key={hint}
              className="rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-xs text-slate-400 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-300 cursor-pointer transition-all"
            >
              {hint}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "flex gap-3",
            msg.role === "user" ? "flex-row-reverse" : "flex-row"
          )}
        >
          {/* Avatar */}
          <div className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            msg.role === "user"
              ? "bg-violet-600 shadow-lg shadow-violet-500/30"
              : "bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10"
          )}>
            {msg.role === "user" ? (
              <User className="h-4 w-4 text-white" />
            ) : (
              <Cpu className="h-4 w-4 text-violet-400" />
            )}
          </div>

          {/* Bubble */}
          <div className={cn(
            "max-w-[75%] rounded-2xl px-4 py-3 text-sm",
            msg.role === "user"
              ? "rounded-tr-sm bg-violet-600 text-white"
              : "rounded-tl-sm bg-white/5 border border-white/8 text-slate-200"
          )}>
            <MessageContent content={msg.content} />
            <p className={cn(
              "mt-1.5 text-[10px]",
              msg.role === "user" ? "text-violet-200/60 text-right" : "text-slate-600"
            )}>
              {formatTime(msg.timestamp)}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

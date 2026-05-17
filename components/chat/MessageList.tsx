"use client";

import { useEffect, useRef, useState } from "react";
import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Brain, ChevronDown, Cpu, MessageSquare, User } from "lucide-react";
import MarkdownContent from "./MarkdownContent";
import ChatAttachmentChip from "./ChatAttachmentChip";
import { chatAttachmentId } from "@/lib/chat-attachments";

interface MessageListProps {
  messages: Message[];
  projectName: string;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function ThinkingBlock({
  text,
  live,
  defaultOpen = true,
}: {
  text: string;
  live?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const preview = text.trim().slice(0, 160).replace(/\s+/g, " ");
  const needsTruncate = text.trim().length > 160;
  return (
    <div className="mb-2 w-full min-w-0 overflow-hidden rounded-lg border border-violet-500/30 bg-violet-950/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px] text-violet-100 transition-colors hover:bg-violet-500/15"
      >
        <Brain className="h-3.5 w-3.5 flex-shrink-0 text-violet-300" />
        <span className="min-w-0 flex-1 font-medium">
          {live ? "Canlı model düşüncesi" : "Model düşüncesi"}
        </span>
        <span className="hidden flex-shrink-0 text-[10px] text-violet-300/70 sm:inline">
          {open ? "Daralt" : "Genişlet"}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 flex-shrink-0 text-violet-300 transition-transform", open && "rotate-180")}
        />
      </button>
      {!open && (
        <p className="border-t border-violet-500/20 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
          {preview}
          {needsTruncate ? "…" : ""}
        </p>
      )}
      {open && (
        <div
          className="max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto border-t border-violet-500/25 px-3 py-3 [scrollbar-color:rgba(139,92,246,0.5)_transparent]"
          title="Düşünce metni"
        >
          <MarkdownContent content={text} variant="thinking" />
        </div>
      )}
    </div>
  );
}

export function LiveResponseBlock({
  text,
  live,
  defaultOpen = true,
}: {
  text: string;
  live?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const preview = text.trim().slice(0, 160).replace(/\s+/g, " ");
  const needsTruncate = text.trim().length > 160;
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-sky-500/30 bg-sky-950/35">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px] text-sky-100 transition-colors hover:bg-sky-500/15"
      >
        <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 text-sky-300" />
        <span className="min-w-0 flex-1 font-medium">
          {live ? "Yanıt metni (oluşuyor)" : "Yanıt metni"}
        </span>
        <span className="hidden flex-shrink-0 text-[10px] text-sky-300/70 sm:inline">
          {open ? "Daralt" : "Genişlet"}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 flex-shrink-0 text-sky-300 transition-transform", open && "rotate-180")}
        />
      </button>
      {!open && (
        <p className="border-t border-sky-500/20 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
          {preview}
          {needsTruncate ? "…" : ""}
        </p>
      )}
      {open && (
        <div
          className="max-h-[min(70vh,28rem)] overflow-x-hidden overflow-y-auto border-t border-sky-500/25 px-3 py-3 [scrollbar-color:rgba(56,189,248,0.45)_transparent]"
          title="Yanıt metni"
        >
          <MarkdownContent content={text} />
        </div>
      )}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  return <MarkdownContent content={content} />;
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
            "min-w-0 max-w-[75%] rounded-2xl px-4 py-3 text-sm",
            msg.role === "user"
              ? "rounded-tr-sm bg-violet-600 text-white"
              : "rounded-tl-sm bg-white/5 border border-white/8 text-slate-200"
          )}>
            {msg.role === "assistant" && msg.thinking?.trim() ? (
              <ThinkingBlock text={msg.thinking} />
            ) : null}
            {msg.content.trim() ? <MessageContent content={msg.content} /> : null}
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {msg.attachments.map((attachment) => (
                  <ChatAttachmentChip
                    key={chatAttachmentId(attachment)}
                    attachment={attachment}
                    variant={msg.role === "user" ? "message-user" : "message-assistant"}
                  />
                ))}
              </div>
            )}
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

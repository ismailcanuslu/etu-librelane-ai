"use client";

import { Brain } from "lucide-react";
import MessageList, { ThinkingBlock } from "./MessageList";
import ChatInput from "./ChatInput";
import type { ChatAttachmentRef, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface ChatThreadProps {
  messages: Message[];
  projectName: string;
  isLoading: boolean;
  streamPreview?: { thinking?: string; content?: string } | null;
  attachments: ChatAttachmentRef[];
  onAddAttachment: (attachment: ChatAttachmentRef) => void;
  onRemoveAttachment: (key: string) => void;
  onSend: (content: string, attachments: ChatAttachmentRef[]) => void;
}

export default function ChatThread({
  messages,
  projectName,
  isLoading,
  streamPreview,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onSend,
}: ChatThreadProps) {
  const loadSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading) return;
    loadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading, streamPreview?.thinking, streamPreview?.content]);

  const hasStream = Boolean(streamPreview?.thinking?.trim() || streamPreview?.content?.trim());

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} projectName={projectName} />

      {isLoading && (
        <div ref={loadSectionRef} className="flex flex-col border-t border-white/6 bg-[#0d1117]/95">
          {hasStream && (
            <div className="space-y-2 px-4 py-3">
              {streamPreview?.thinking?.trim() ? (
                <ThinkingBlock text={streamPreview.thinking} live defaultOpen />
              ) : null}
              {streamPreview?.content?.trim() ? (
                <details className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] open:bg-white/[0.06]">
                  <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-slate-300 hover:bg-white/5">
                    Yanıt metni (oluşuyor)
                  </summary>
                  <pre className="max-h-[min(40vh,16rem)] overflow-auto border-t border-white/8 px-3 py-2.5 font-sans text-[12px] leading-relaxed text-slate-200 whitespace-pre-wrap [scrollbar-color:rgba(148,163,184,0.4)_transparent]">
                    {streamPreview.content}
                  </pre>
                </details>
              ) : null}
            </div>
          )}
          <div className="flex items-center gap-3 bg-[#0d1117]/80 px-4 py-2.5">
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full",
              "border border-violet-500/35 bg-violet-500/10 shadow-inner shadow-violet-500/20"
            )}
          >
            <Brain className="h-4 w-4 animate-pulse text-violet-300" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[11px] font-medium tracking-wide text-violet-200/90 animate-pulse">
              Düşünüyor…
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400/90"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
        </div>
      )}

      <ChatInput
        onSend={onSend}
        isLoading={isLoading}
        attachments={attachments}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={onRemoveAttachment}
      />
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Send, Loader2, X, Folder, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachmentRef } from "@/lib/types";
import { readWorkspaceAttachment, WORKSPACE_ATTACHMENT_MIME } from "@/lib/workspace-drag";

interface ChatInputProps {
  onSend: (message: string, attachments: ChatAttachmentRef[]) => void;
  isLoading?: boolean;
  attachments: ChatAttachmentRef[];
  onAddAttachment: (attachment: ChatAttachmentRef) => void;
  onRemoveAttachment: (key: string) => void;
}

export default function ChatInput({
  onSend,
  isLoading,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;
    onSend(trimmed, attachments);
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const payload = readWorkspaceAttachment(e.dataTransfer);
    if (!payload) return;
    onAddAttachment({
      key: payload.key,
      name: payload.name,
      type: payload.type,
    });
  }

  return (
    <div
      className={cn(
        "border-t border-white/8 bg-[#0d1117]/80 px-4 py-4 backdrop-blur-sm",
        dragOver && "bg-violet-500/5"
      )}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(WORKSPACE_ATTACHMENT_MIME)) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((attachment) => (
            <span
              key={`${attachment.type}:${attachment.key}`}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300"
            >
              {attachment.type === "dir" ? (
                <Folder className="h-3 w-3 text-amber-400" />
              ) : (
                <File className="h-3 w-3 text-sky-400" />
              )}
              <span className="max-w-[160px] truncate">{attachment.name}</span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(attachment.key)}
                className="text-slate-500 hover:text-slate-200"
                title="Eki kaldır"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-3 rounded-2xl border bg-white/4 px-4 py-3 transition-all duration-200",
          value || dragOver ? "border-violet-500/40 shadow-lg shadow-violet-500/5" : "border-white/8"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="LibreLane projeni anlat veya dosya/klasör sürükle... (⌘+Enter gönder)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none leading-relaxed"
          style={{ minHeight: "24px", maxHeight: "160px" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={(!value.trim() && attachments.length === 0) || isLoading}
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200",
            (value.trim() || attachments.length > 0) && !isLoading
              ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20 active:scale-95"
              : "bg-white/5 text-slate-600 cursor-not-allowed"
          )}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-slate-600">
        Sol dosya ağacından dosya veya klasörü buraya sürükleyerek ekleyebilirsin.
      </p>
    </div>
  );
}

"use client";

import { Folder, File, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatAttachmentRef } from "@/lib/types";
import { chatAttachmentId, formatAttachmentChipLabel } from "@/lib/chat-attachments";

interface ChatAttachmentChipProps {
  attachment: ChatAttachmentRef;
  variant?: "input" | "message-user" | "message-assistant";
  onRemove?: () => void;
}

export default function ChatAttachmentChip({
  attachment,
  variant = "input",
  onRemove,
}: ChatAttachmentChipProps) {
  const label = formatAttachmentChipLabel(attachment);
  const hasRange = attachment.lineStart != null && attachment.lineEnd != null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-[10px]",
        variant === "input" && "border-white/10 bg-white/5 text-slate-300",
        variant === "message-user" && "border-white/15 bg-white/10 text-violet-50",
        variant === "message-assistant" && "border-white/10 bg-white/5 text-slate-300"
      )}
      title={hasRange ? `${attachment.key} · satır ${attachment.lineStart}–${attachment.lineEnd}` : attachment.key}
    >
      {attachment.type === "dir" ? (
        <Folder className="h-3 w-3 flex-shrink-0 text-amber-400" />
      ) : (
        <File className="h-3 w-3 flex-shrink-0 text-sky-400" />
      )}
      <span className="truncate font-mono">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 text-slate-500 hover:text-slate-200"
          title="Eki kaldır"
          aria-label={`${label} ekini kaldır`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

export { chatAttachmentId };

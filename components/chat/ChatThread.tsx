"use client";

import { Brain } from "lucide-react";
import MessageList, { ThinkingBlock } from "./MessageList";
import MarkdownContent from "./MarkdownContent";
import ChatInput from "./ChatInput";
import PlanApprovalBar from "./PlanApprovalBar";
import FileChangeApprovalPanel from "./FileChangeApprovalPanel";
import type {
  ChatAttachmentRef,
  ChatMode,
  Message,
  PendingFileChanges,
  PendingPlan,
} from "@/lib/types";
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
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  onSend: (content: string, attachments: ChatAttachmentRef[]) => void;
  pendingPlan?: PendingPlan | null;
  onPlanApprove?: () => void;
  onPlanEdit?: () => void;
  onPlanReject?: () => void;
  planActionBusy?: boolean;
  pendingFileChanges?: PendingFileChanges | null;
  onFileChangesApprove?: (paths: string[]) => void;
  onFileChangesReject?: () => void;
  fileChangeBusy?: boolean;
}

export default function ChatThread({
  messages,
  projectName,
  isLoading,
  streamPreview,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  chatMode,
  onChatModeChange,
  onSend,
  pendingPlan,
  onPlanApprove,
  onPlanEdit,
  onPlanReject,
  planActionBusy = false,
  pendingFileChanges,
  onFileChangesApprove,
  onFileChangesReject,
  fileChangeBusy = false,
}: ChatThreadProps) {
  const awaitingApproval = Boolean(pendingPlan) || Boolean(pendingFileChanges);
  const inputDisabledHint = pendingPlan
    ? "Önce planı onaylayın, düzenleyin veya reddedin."
    : pendingFileChanges
      ? "Önce dosya değişikliklerini onaylayın veya reddedin."
      : undefined;
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
        <div ref={loadSectionRef} className="flex min-w-0 flex-col border-t border-white/6 bg-[#0d1117]/95">
          {hasStream && (
            <div className="min-w-0 space-y-2 px-4 py-3">
              {streamPreview?.thinking?.trim() ? (
                <ThinkingBlock text={streamPreview.thinking} live defaultOpen />
              ) : null}
              {streamPreview?.content?.trim() ? (
                <details className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] open:bg-white/[0.06]">
                  <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-slate-300 hover:bg-white/5">
                    Yanıt metni (oluşuyor)
                  </summary>
                  <div className="max-h-[min(40vh,16rem)] overflow-x-hidden overflow-y-auto border-t border-white/8 px-3 py-2.5 [scrollbar-color:rgba(148,163,184,0.4)_transparent]">
                    <MarkdownContent content={streamPreview.content} />
                  </div>
                </details>
              ) : null}
            </div>
          )}
          <div className="flex min-w-0 items-center gap-3 bg-[#0d1117]/80 px-4 py-2.5">
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

      {pendingPlan && onPlanApprove && onPlanEdit && onPlanReject ? (
        <PlanApprovalBar
          pending={pendingPlan}
          onApprove={onPlanApprove}
          onEdit={onPlanEdit}
          onReject={onPlanReject}
          busy={planActionBusy || isLoading}
        />
      ) : null}

      {pendingFileChanges && onFileChangesApprove && onFileChangesReject ? (
        <FileChangeApprovalPanel
          pending={pendingFileChanges}
          onApprove={onFileChangesApprove}
          onReject={onFileChangesReject}
          busy={fileChangeBusy || isLoading}
        />
      ) : null}

      <ChatInput
        onSend={onSend}
        isLoading={isLoading || awaitingApproval}
        chatMode={chatMode}
        onChatModeChange={onChatModeChange}
        attachments={attachments}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={onRemoveAttachment}
        inputDisabled={awaitingApproval}
        inputDisabledHint={inputDisabledHint}
      />
    </div>
  );
}

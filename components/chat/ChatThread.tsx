"use client";

import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import type { ChatAttachmentRef, Message } from "@/lib/types";

interface ChatThreadProps {
  messages: Message[];
  projectName: string;
  isLoading: boolean;
  attachments: ChatAttachmentRef[];
  onAddAttachment: (attachment: ChatAttachmentRef) => void;
  onRemoveAttachment: (key: string) => void;
  onSend: (content: string, attachments: ChatAttachmentRef[]) => void;
}

export default function ChatThread({
  messages,
  projectName,
  isLoading,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onSend,
}: ChatThreadProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} projectName={projectName} />

      {isLoading && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-slate-700 to-slate-800">
            <span className="text-xs">🤖</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-violet-500"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
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

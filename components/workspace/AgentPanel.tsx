"use client";

import { useState, useEffect } from "react";
import {
  PanelRightClose,
  MessageSquare,
  Zap,
  Wrench,
  ScanSearch,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import ChatThread from "@/components/chat/ChatThread";
import { AgentWorkflowBody, type AgentWorkflowTab } from "@/components/build/RightPanel";
import type { ChatAttachmentRef, Message } from "@/lib/types";
import {
  onLateChatReply,
  sendChatMessage,
  stopChatTransport,
  connectAiAgent,
  type AiAgentStatus,
} from "@/lib/ai-client";
import { buildMessageWithAttachments } from "@/lib/chat-attachments";
import { fetchChatHistory, putChatHistory } from "@/lib/chat-history-api";
import { cn } from "@/lib/utils";

type AgentPanelTab = "chat" | AgentWorkflowTab;

const TABS: { id: AgentPanelTab; label: string; icon: React.ReactNode }[] = [
  { id: "chat", label: "Sohbet", icon: <MessageSquare className="h-3 w-3" /> },
  { id: "build", label: "Derleme", icon: <Zap className="h-3 w-3" /> },
  { id: "tools", label: "Araçlar", icon: <Wrench className="h-3 w-3" /> },
  { id: "analysis", label: "Analiz", icon: <ScanSearch className="h-3 w-3" /> },
];

interface AgentPanelProps {
  projectId: string;
  projectBucket: string;
  projectName: string;
  onClose: () => void;
  onOpenWorkspaceFile?: (key: string) => void;
}

function AgentConnectionBanner({ status }: { status: AiAgentStatus }) {
  const isConnecting = status.phase === "connecting";
  const isReady = status.phase === "ready";

  return (
    <div
      className={cn(
        "mx-3 mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px]",
        isReady && "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
        isConnecting && "border-violet-500/25 bg-violet-500/10 text-violet-200",
        !isReady && !isConnecting && "border-rose-500/25 bg-rose-500/10 text-rose-200"
      )}
    >
      {isConnecting ? (
        <Loader2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 animate-spin" />
      ) : isReady ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
      )}
      <div className="min-w-0">
        <p className="font-medium">
          {isConnecting
            ? `AI asistanı ${status.model ?? "Ollama"} modeline bağlanıyor...`
            : isReady
              ? `AI asistanı ${status.model ?? "Ollama"} modeline bağlı`
              : "Ajana bağlanılamadı"}
        </p>
        <p className="mt-0.5 text-[10px] opacity-90">{status.message}</p>
      </div>
    </div>
  );
}

export default function AgentPanel({
  projectId,
  projectBucket,
  projectName,
  onClose,
  onOpenWorkspaceFile,
}: AgentPanelProps) {
  const [tab, setTab] = useState<AgentPanelTab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ChatAttachmentRef[]>([]);
  const [streamPreview, setStreamPreview] = useState<{ thinking?: string; content?: string } | null>(null);
  const [agentStatus, setAgentStatus] = useState<AiAgentStatus>({
    phase: "connecting",
    message: "Ollama servisi kontrol ediliyor...",
    model: "Ollama",
  });

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    void fetchChatHistory(projectId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (tab !== "chat") return;
    let cancelled = false;
    setAgentStatus({
      phase: "connecting",
      message: "Ollama servisi açılmaya çalışılıyor...",
      model: "Ollama",
    });
    void connectAiAgent().then((status) => {
      if (!cancelled) setAgentStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    return () => {
      stopChatTransport();
    };
  }, []);

  useEffect(() => {
    onLateChatReply(({ reply, thinking }) => {
      const assistantMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
        ...(thinking ? { thinking } : {}),
      };
      setMessages((prev) => {
        const withReply = [...prev, assistantMsg];
        void putChatHistory(projectId, withReply).catch(() => {});
        return withReply;
      });
    });
    return () => {
      onLateChatReply(null);
    };
  }, [projectId]);

  async function handleSend(content: string, nextAttachments: ChatAttachmentRef[]) {
    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
      attachments: nextAttachments.length ? nextAttachments : undefined,
    };
    let historyForApi: Message[] = [];
    setMessages((prev) => {
      const withUser = [...prev, userMsg];
      historyForApi = withUser;
      void putChatHistory(projectId, withUser).catch(() => {});
      return withUser;
    });
    setAttachments([]);
    setStreamPreview(null);
    setIsLoading(true);

    try {
      if (agentStatus.phase !== "ready") {
        const refreshed = await connectAiAgent();
        setAgentStatus(refreshed);
        if (refreshed.phase !== "ready") {
          throw new Error(refreshed.message);
        }
      }

      const outbound = await buildMessageWithAttachments(projectBucket, content, nextAttachments);
      const { reply: replyText, thinking } = await sendChatMessage(
        outbound,
        historyForApi.slice(0, -1).map((msg) => ({ role: msg.role, content: msg.content })),
        {
          onPartial: (p) => {
            setStreamPreview((prev) => ({ ...prev, ...p }));
          },
        }
      );
      const assistantMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString(),
        ...(thinking ? { thinking } : {}),
      };
      setMessages((prev) => {
        const withReply = [...prev, assistantMsg];
        void putChatHistory(projectId, withReply).catch(() => {});
        return withReply;
      });
    } catch (error) {
      const assistantMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        content: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const withReply = [...prev, assistantMsg];
        void putChatHistory(projectId, withReply).catch(() => {});
        return withReply;
      });
    } finally {
      setStreamPreview(null);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (pendingInput !== null && tab === "chat") {
      const msg = pendingInput;
      setPendingInput(null);
      void handleSend(msg, []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tek seferlik pending mesaj
  }, [tab, pendingInput]);

  function handleWorkflowAskAI(msg: string) {
    setTab("chat");
    setPendingInput(msg);
  }

  function addAttachment(attachment: ChatAttachmentRef) {
    setAttachments((prev) => {
      if (prev.some((item) => item.key === attachment.key && item.type === attachment.type)) {
        return prev;
      }
      return [...prev, attachment];
    });
  }

  function removeAttachment(key: string) {
    setAttachments((prev) => prev.filter((item) => item.key !== key));
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-[#0d1117]">
      <header className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            AI / LibreLane
          </p>
          <p className="truncate text-xs font-medium text-slate-200">{projectName || "Proje"}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/8 hover:text-slate-300"
          title="Paneli gizle"
        >
          <PanelRightClose className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-shrink-0 overflow-x-auto border-b border-white/8">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-shrink-0 items-center gap-1 px-2.5 py-2 text-[11px] font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-violet-500 text-violet-300"
                : "border-b-2 border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "chat" ? (
          <>
            <AgentConnectionBanner status={agentStatus} />
            <ChatThread
              messages={messages}
              projectName={projectName}
              isLoading={isLoading}
              streamPreview={streamPreview}
              attachments={attachments}
              onAddAttachment={addAttachment}
              onRemoveAttachment={removeAttachment}
              onSend={(content, sentAttachments) => void handleSend(content, sentAttachments)}
            />
          </>
        ) : (
          <AgentWorkflowBody
            activeTab={tab}
            projectId={projectBucket}
            projectName={projectName}
            onAskAI={handleWorkflowAskAI}
            onOpenWorkspaceFile={onOpenWorkspaceFile}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { PanelRightClose, MessageSquare, Zap, Wrench, ScanSearch } from "lucide-react";
import ChatThread from "@/components/chat/ChatThread";
import { AgentWorkflowBody, type AgentWorkflowTab } from "@/components/build/RightPanel";
import type { Message } from "@/lib/types";
import { sendChatMessage } from "@/lib/ai-client";
import { getChatHistory, saveChatHistory } from "@/lib/store";
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
  /**
   * Backend tool runner'a iletilen workspace proje kimliği. Job'lar bu
   * isimle saklanır; UI projeleri seçimi için projectId (lokal) kullanır.
   */
  projectBucket: string;
  projectName: string;
  onClose: () => void;
  onOpenWorkspaceFile?: (key: string) => void;
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

  useEffect(() => {
    setMessages(getChatHistory(projectId));
  }, [projectId]);

  async function handleSend(content: string) {
    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    let historyForApi: Message[] = [];
    setMessages((prev) => {
      const withUser = [...prev, userMsg];
      historyForApi = withUser;
      saveChatHistory(projectId, withUser);
      return withUser;
    });
    setIsLoading(true);

    try {
      const reply = await sendChatMessage(
        content,
        historyForApi.slice(0, -1).map((msg) => ({ role: msg.role, content: msg.content }))
      );
      const assistantMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => {
        const withReply = [...prev, assistantMsg];
        saveChatHistory(projectId, withReply);
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
        saveChatHistory(projectId, withReply);
        return withReply;
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (pendingInput !== null && tab === "chat") {
      const msg = pendingInput;
      setPendingInput(null);
      handleSend(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tek seferlik pending mesaj
  }, [tab, pendingInput]);

  function handleWorkflowAskAI(msg: string) {
    setTab("chat");
    setPendingInput(msg);
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
          <ChatThread
            messages={messages}
            projectName={projectName}
            isLoading={isLoading}
            onSend={handleSend}
          />
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

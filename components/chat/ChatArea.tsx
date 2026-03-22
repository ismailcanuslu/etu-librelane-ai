"use client";

import { useState, useEffect } from "react";
import ChatHeader, { PanelTab } from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import RightPanel from "@/components/build/RightPanel";
import { Message } from "@/lib/mock-data";
import { getChatHistory, saveChatHistory } from "@/lib/store";

const MOCK_RESPONSES = [
  "Anladım! Bu konuyu LibreLane akışında ele alalım. Verilog modülünüzü analiz ediyorum...",
  "Harika bir soru! OpenLane bu senaryoyu şu şekilde yönetir: sentez aşamasında Yosys kullanılır, ardından floorplanning ve routing adımları takip eder.",
  "Bu tasarım için önerilen PnR konfigürasyonu şöyle olmalı. `config.json` dosyasını güncelleyelim.",
  "Simülasyon çıktısını inceliyorum. GTKWave ile dalga formunu görselleştirmek için VCD dosyasını kullanabilirsiniz.",
  "RTL doğrulaması tamamlandı. Testbench sonuçları beklenen değerlerle uyuşuyor. Sentez adımına geçebiliriz.",
  "Bu hatayı inceledim. Timing ihlalinin nedeni kritik yol üzerindeki yüksek fanout. Buffering eklemenizi öneririm.",
  "Uyarı mesajı şu anlama geliyor: latch çıkarımı (latch inference) istenmeyen davranışa yol açabilir. Tüm `always` bloklarında explicit reset kullanmayı deneyin.",
];

interface ChatAreaProps {
  projectId: string;
  projectName: string;
}

export default function ChatArea({ projectId, projectName }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeTab, setActiveTab] = useState<PanelTab | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInput, setPendingInput] = useState<string | null>(null);

  useEffect(() => {
    setMessages(getChatHistory(projectId));
  }, [projectId]);

  // If there's a pending message from "Ask AI" button, send it once panel closes
  useEffect(() => {
    if (pendingInput && activeTab === null) {
      const msg = pendingInput;
      setPendingInput(null);
      handleSend(msg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pendingInput]);

  function handleTabClick(tab: PanelTab) {
    setActiveTab((prev) => (prev === tab ? null : tab));
  }

  function handleSend(content: string) {
    const userMsg: Message = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);
    saveChatHistory(projectId, updated);
    setIsLoading(true);

    setTimeout(() => {
      const reply = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
      const assistantMsg: Message = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      const withReply = [...updated, assistantMsg];
      setMessages(withReply);
      saveChatHistory(projectId, withReply);
      setIsLoading(false);
    }, 1200 + Math.random() * 800);
  }

  function handleAskAI(msg: string) {
    // Close panel first, then send
    setPendingInput(msg);
    setActiveTab(null);
  }

  return (
    <div className="relative flex flex-1 flex-col h-full overflow-hidden">
      <ChatHeader
        projectName={projectName}
        activeTab={activeTab}
        onTabClick={handleTabClick}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Chat column */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${activeTab ? "mr-[440px]" : ""}`}>
          <MessageList messages={messages} projectName={projectName} />

          {isLoading && (
            <div className="flex items-center gap-2 px-6 pb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
                <span className="text-xs">🤖</span>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-violet-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <ChatInput onSend={handleSend} isLoading={isLoading} />
        </div>
      </div>

      {/* Right panel — absolute so it overlays without blur */}
      <RightPanel
        open={activeTab !== null}
        onClose={() => setActiveTab(null)}
        projectId={projectId}
        projectName={projectName}
        onAskAI={handleAskAI}
        defaultTab={activeTab ?? "build"}
      />
    </div>
  );
}

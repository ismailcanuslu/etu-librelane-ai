"use client";

import { Zap, Wrench, ScanSearch, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelTab = "build" | "tools" | "analysis";

interface ChatHeaderProps {
  projectName: string;
  activeTab: PanelTab | null;
  onTabClick: (tab: PanelTab) => void;
}

const TABS: { id: PanelTab; label: string; icon: React.ReactNode; color: string }[] = [
  {
    id: "build",
    label: "Derleme",
    icon: <Zap className="h-3.5 w-3.5" />,
    color: "data-active:border-amber-500 data-active:text-amber-300",
  },
  {
    id: "tools",
    label: "Araç Takımı",
    icon: <Wrench className="h-3.5 w-3.5" />,
    color: "data-active:border-violet-500 data-active:text-violet-300",
  },
  {
    id: "analysis",
    label: "Analiz",
    icon: <ScanSearch className="h-3.5 w-3.5" />,
    color: "data-active:border-sky-500 data-active:text-sky-300",
  },
];

export default function ChatHeader({ projectName, activeTab, onTabClick }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-white/8 bg-[#0d1117] px-4 flex-shrink-0">
      {/* Project name */}
      <div className="flex items-center gap-2 py-3">
        <FolderOpen className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold text-white">{projectName}</span>
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
          aktif
        </span>
      </div>

      {/* Tab buttons */}
      <div className="flex items-center h-full">
        {TABS.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabClick(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 h-full transition-all",
                isActive
                  ? t.id === "build"
                    ? "border-amber-500 text-amber-300"
                    : t.id === "tools"
                    ? "border-violet-500 text-violet-300"
                    : "border-sky-500 text-sky-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {t.icon}
              <span className="hidden sm:block">{t.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare } from "lucide-react";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import FileEditorTabs from "@/components/editor/FileEditorTabs";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import {
  getActiveProjectId,
  getProjects,
  saveActiveProjectId,
} from "@/lib/store";
import type { Project, FileTab, FileNode } from "@/lib/types";
import { isTextFile } from "@/lib/types";

// ─── Tab bar (Chat + file tabs) ───────────────────────────────────────────────

interface MainTabBarProps {
  fileTabs: FileTab[];
  activePane: "chat" | string; // "chat" or file key
  onPaneChange: (key: "chat" | string) => void;
  onFileTabClose: (key: string) => void;
}

function MainTabBar({ fileTabs, activePane, onPaneChange, onFileTabClose }: MainTabBarProps) {
  return (
    <div className="flex items-end border-b border-white/8 bg-[#0a0f16] overflow-x-auto flex-shrink-0">
      {/* Chat tab */}
      <button
        onClick={() => onPaneChange("chat")}
        className={cn(
          "flex items-center gap-1.5 border-r border-white/8 px-4 py-2 text-xs transition-colors flex-shrink-0",
          activePane === "chat"
            ? "bg-[#0d1117] text-slate-200 border-t border-t-violet-500"
            : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
        )}
      >
        <MessageSquare className="h-3 w-3" />
        <span>Chat</span>
      </button>

      {/* File tabs */}
      {fileTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onPaneChange(tab.key)}
          className={cn(
            "group flex items-center gap-1.5 border-r border-white/8 px-3 py-2 text-xs transition-colors flex-shrink-0 max-w-[200px]",
            activePane === tab.key
              ? "bg-[#0d1117] text-slate-200 border-t border-t-violet-500"
              : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
          )}
        >
          <span className="truncate">{tab.name}</span>
          {tab.dirty && <span className="text-amber-400 flex-shrink-0 text-[10px]">•</span>}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onFileTabClose(tab.key); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onFileTabClose(tab.key); } }}
            className={cn(
              "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded text-slate-600 hover:text-slate-300 transition-colors",
              activePane !== tab.key && "opacity-0 group-hover:opacity-100"
            )}
            title="Kapat"
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);

  // Pane state: "chat" | file key
  const [activePane, setActivePane] = useState<"chat" | string>("chat");
  // Opened file tabs
  const [fileTabs, setFileTabs] = useState<FileTab[]>([]);

  // Seed from localStorage on first render — Sidebar will sync from MinIO
  useEffect(() => {
    const stored = getProjects();
    const id = getActiveProjectId();
    if (stored.length > 0) {
      setProjects(stored);
      const resolvedId = id || stored[0]?.id || "";
      setActiveProjectId(resolvedId);
      if (!id && stored[0]) saveActiveProjectId(stored[0].id);
    }
  }, []);

  const handleProjectChange = useCallback((id: string) => {
    setActiveProjectId(id);
    saveActiveProjectId(id);
    setProjects(getProjects());
    setFileTabs([]);
    setActivePane("chat");
  }, []);

  // Open a file in a tab
  const handleOpenFile = useCallback((node: FileNode, bucket: string) => {
    if (!isTextFile(node.ext)) return;

    const existing = fileTabs.find((t) => t.key === node.key && t.bucket === bucket);
    if (existing) {
      setActivePane(node.key);
      return;
    }

    const newTab: FileTab = {
      key: node.key,
      bucket,
      name: node.name,
      content: "",
      dirty: false,
    };
    setFileTabs((prev) => [...prev, newTab]);
    setActivePane(node.key);
  }, [fileTabs]);

  const handleTabClose = useCallback((key: string) => {
    setFileTabs((prev) => {
      const idx = prev.findIndex((t) => t.key === key);
      const next = prev.filter((t) => t.key !== key);
      // Switch pane: if this was active, go to adjacent tab or chat
      if (activePane === key) {
        const adjacent = next[idx] ?? next[idx - 1];
        setActivePane(adjacent?.key ?? "chat");
      }
      return next;
    });
  }, [activePane]);

  const handleTabUpdate = useCallback((key: string, patch: Partial<FileTab>) => {
    setFileTabs((prev) =>
      prev.map((t) => (t.key === key ? { ...t, ...patch } : t))
    );
  }, []);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  return (
    <TooltipProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-[#0d1117]">
        <Sidebar
          activeProjectId={activeProjectId}
          onProjectChange={handleProjectChange}
          onOpenFile={handleOpenFile}
        />

        <main className="flex flex-1 flex-col overflow-hidden min-w-0">
          {/* Unified tab bar */}
          <MainTabBar
            fileTabs={fileTabs}
            activePane={activePane}
            onPaneChange={(key) => setActivePane(key)}
            onFileTabClose={handleTabClose}
          />

          {/* Content pane */}
          <div className="flex flex-1 overflow-hidden">
            {/* Chat — hidden (not unmounted) when a file tab is active */}
            <div className={cn("flex flex-1 flex-col overflow-hidden", activePane !== "chat" && "hidden")}>
          <ChatArea
            key={activeProjectId}
            projectId={activeProjectId}
            projectName={activeProject?.name ?? ""}
          />

            </div>

            {/* File editor — only rendered when there are open tabs */}
            {fileTabs.length > 0 && activePane !== "chat" && (
              <FileEditorTabs
                tabs={fileTabs}
                activeKey={activePane}
                onTabChange={(key) => setActivePane(key)}
                onTabClose={handleTabClose}
                onTabUpdate={handleTabUpdate}
              />
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

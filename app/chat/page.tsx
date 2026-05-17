"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PanelRightOpen, FileCode2 } from "lucide-react";
import Sidebar from "@/components/sidebar/Sidebar";
import FileEditorTabs from "@/components/editor/FileEditorTabs";
import OllamaSettingsEditor from "@/components/settings/OllamaSettingsEditor";
import ToolRunPreviewEditor from "@/components/build/ToolRunPreviewEditor";
import AutonomWorkshopPane from "@/components/autonom/AutonomWorkshopPane";
import AgentPanel from "@/components/workspace/AgentPanel";
import WorkspaceTerminal from "@/components/workspace/WorkspaceTerminal";
import ResizeHandle from "@/components/ui/ResizeHandle";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { ActiveJobProvider, useActiveJob } from "@/lib/active-job-context";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_LAYOUT_DEFAULTS,
  WORKSPACE_LAYOUT_LIMITS,
  clamp,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
  type WorkspaceLayout,
} from "@/lib/workspace-layout";
import {
  getActiveProjectId,
  getProjects,
  saveActiveProjectId,
} from "@/lib/store";
import type {
  Project,
  FileTab,
  FileNode,
  ToolRunTabState,
  AutonomWorkshopTabState,
} from "@/lib/types";
import {
  isGdsFile,
  isTextFile,
  isVcdFile,
  OLLAMA_SETTINGS_TAB_KEY,
  toolRunTabKey,
  autonomWorkshopTabKey,
} from "@/lib/types";
import {
  OPEN_TOOL_RUN_TAB_EVENT,
  OPEN_AUTONOM_WORKSHOP_TAB_EVENT,
  type OpenToolRunTabDetail,
  type OpenAutonomWorkshopTabDetail,
} from "@/lib/workspace-events";

interface EditorTabBarProps {
  fileTabs: FileTab[];
  activeFileKey: string | null;
  onSelectFile: (key: string) => void;
  onFileTabClose: (key: string) => void;
}

function EditorTabBar({ fileTabs, activeFileKey, onSelectFile, onFileTabClose }: EditorTabBarProps) {
  if (fileTabs.length === 0) {
    return (
      <div className="flex h-9 flex-shrink-0 items-center border-b border-white/8 bg-[#1e1e1e] px-3 text-[11px] text-slate-600">
        <span className="text-slate-500">Dosya açmak için sol gezginde bir öğe seçin</span>
      </div>
    );
  }

  return (
    <div className="flex flex-shrink-0 items-end overflow-x-auto border-b border-white/8 bg-[#252526]">
      {fileTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onSelectFile(tab.key)}
          className={cn(
            "group flex max-w-[200px] flex-shrink-0 items-center gap-1.5 border-r border-white/[0.06] px-3 py-2 text-xs transition-colors",
            activeFileKey === tab.key
              ? "bg-[#1e1e1e] text-slate-100"
              : "bg-[#2d2d2d] text-slate-400 hover:bg-[#323232] hover:text-slate-200"
          )}
        >
          <span className="truncate">
            {tab.kind === "tool-run"
              ? `▶ ${tab.name}`
              : tab.kind === "vcd-viewer"
                ? `〰 ${tab.name}`
                : tab.name}
          </span>
          {tab.dirty && <span className="flex-shrink-0 text-[10px] text-amber-400">•</span>}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onFileTabClose(tab.key);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onFileTabClose(tab.key);
              }
            }}
            className={cn(
              "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200",
              activeFileKey !== tab.key && "opacity-0 group-hover:opacity-100"
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

function EmptyEditor() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[#1e1e1e] px-6 text-center">
      <FileCode2 className="h-12 w-12 text-slate-600" />
      <div>
        <p className="text-sm font-medium text-slate-400">Düzenleyici</p>
        <p className="mt-1 max-w-sm text-xs text-slate-600">
          Proje ağacından bir metin dosyası açın. Sekmeler üstte, terminal altta — sohbet ve araçlar sağ panelde.
        </p>
      </div>
    </div>
  );
}

function ChatWorkspaceLayout({
  activeProjectId,
  projects,
  onProjectChange,
  agentOpen,
  setAgentOpen,
}: {
  activeProjectId: string;
  projects: Project[];
  onProjectChange: (id: string) => void;
  agentOpen: boolean;
  setAgentOpen: (open: boolean) => void;
}) {
  const { tabs } = useActiveJob();
  const [activeFileKey, setActiveFileKey] = useState<string | null>(null);
  const [fileTabs, setFileTabs] = useState<FileTab[]>([]);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [layout, setLayout] = useState<WorkspaceLayout>(WORKSPACE_LAYOUT_DEFAULTS);
  const layoutReady = useRef(false);

  useEffect(() => {
    setLayout(loadWorkspaceLayout());
    layoutReady.current = true;
  }, []);

  useEffect(() => {
    if (!layoutReady.current) return;
    saveWorkspaceLayout(layout);
  }, [layout]);

  const resizeSidebar = useCallback((delta: number) => {
    setLayout((prev) => ({
      ...prev,
      sidebarWidth: clamp(
        prev.sidebarWidth + delta,
        WORKSPACE_LAYOUT_LIMITS.sidebarWidth.min,
        WORKSPACE_LAYOUT_LIMITS.sidebarWidth.max
      ),
    }));
  }, []);

  const resizeTerminal = useCallback((delta: number) => {
    setLayout((prev) => ({
      ...prev,
      terminalHeight: clamp(
        prev.terminalHeight + delta,
        WORKSPACE_LAYOUT_LIMITS.terminalHeight.min,
        WORKSPACE_LAYOUT_LIMITS.terminalHeight.max
      ),
    }));
  }, []);

  const resizeAgentPanel = useCallback((delta: number) => {
    setLayout((prev) => ({
      ...prev,
      agentPanelWidth: clamp(
        prev.agentPanelWidth + delta,
        WORKSPACE_LAYOUT_LIMITS.agentPanelWidth.min,
        WORKSPACE_LAYOUT_LIMITS.agentPanelWidth.max
      ),
    }));
  }, []);

  const handleToolRunChange = useCallback((runId: string, patch: Partial<ToolRunTabState>) => {
    setFileTabs((prev) =>
      prev.map((t) =>
        t.toolRun?.runId === runId ? { ...t, toolRun: { ...t.toolRun!, ...patch } } : t
      )
    );
  }, []);

  const handleAutonomWorkshopChange = useCallback(
    (runId: string, patch: Partial<AutonomWorkshopTabState>) => {
      setFileTabs((prev) =>
        prev.map((t) =>
          t.autonomWorkshop?.runId === runId
            ? { ...t, autonomWorkshop: { ...t.autonomWorkshop!, ...patch } }
            : t
        )
      );
    },
    []
  );

  const openAutonomWorkshopTab = useCallback((detail: OpenAutonomWorkshopTabDetail) => {
    const key = autonomWorkshopTabKey(detail.configKey, detail.runId);
    const tab: FileTab = {
      kind: "autonom-workshop",
      key,
      bucket: detail.projectId,
      name: `Atölye · ${detail.configKey.split("/").pop() ?? "config"}`,
      content: "",
      dirty: false,
      autonomWorkshop: {
        projectId: detail.projectId,
        configKey: detail.configKey,
        runId: detail.runId,
        step: detail.step ?? 1,
        spec: detail.spec,
        campaignId: detail.campaignId,
        preview: detail.preview,
      },
    };
    setFileTabs((prev) => {
      const existing = prev.find((t) => t.key === key);
      if (existing) return prev.map((t) => (t.key === key ? tab : t));
      return [...prev, tab];
    });
    setActiveFileKey(key);
    setTerminalCollapsed(false);
  }, []);

  const openToolRunTab = useCallback((detail: OpenToolRunTabDetail) => {
    const key = toolRunTabKey(detail.action, detail.runId);
    const tabLabel = detail.jobId
      ? `${detail.preview.label} · ${detail.jobId.slice(0, 8)}`
      : detail.preview.label;
    setFileTabs((prev) => {
      const existing = prev.find((t) => t.key === key);
      const tab: FileTab = {
        kind: "tool-run",
        key,
        bucket: detail.projectId,
        name: tabLabel,
        content: "",
        dirty: false,
        toolRun: {
          projectId: detail.projectId,
          action: detail.action,
          runId: detail.runId,
          preview: detail.preview,
          jobId: detail.jobId,
          selectedInputFiles:
            detail.selectedInputFiles ??
            detail.preview.default_input_files ??
            detail.preview.input_files,
          selectedFlowSteps:
            detail.selectedFlowSteps ??
            detail.preview.selected_flow_steps ??
            detail.preview.default_flow_steps,
        },
      };
      if (existing) {
        return prev.map((t) => (t.key === key ? tab : t));
      }
      return [...prev, tab];
    });
    setActiveFileKey(key);
    setTerminalCollapsed(false);
  }, []);

  useEffect(() => {
    const onToolRun = (e: Event) => {
      const detail = (e as CustomEvent<OpenToolRunTabDetail>).detail;
      if (!detail?.projectId || !detail?.action || !detail?.preview || !detail?.runId) return;
      openToolRunTab(detail);
    };
    window.addEventListener(OPEN_TOOL_RUN_TAB_EVENT, onToolRun);
    return () => window.removeEventListener(OPEN_TOOL_RUN_TAB_EVENT, onToolRun);
  }, [openToolRunTab]);

  useEffect(() => {
    const onAtolye = (e: Event) => {
      const detail = (e as CustomEvent<OpenAutonomWorkshopTabDetail>).detail;
      if (!detail?.projectId || !detail?.configKey || !detail?.runId || !detail?.spec) return;
      openAutonomWorkshopTab(detail);
    };
    window.addEventListener(OPEN_AUTONOM_WORKSHOP_TAB_EVENT, onAtolye);
    return () => window.removeEventListener(OPEN_AUTONOM_WORKSHOP_TAB_EVENT, onAtolye);
  }, [openAutonomWorkshopTab]);

  useEffect(() => {
    const hasLive = tabs.some(
      (tab) =>
        tab.projectId === activeProjectId &&
        !tab.finishedAt &&
        (tab.status === "running" || tab.status === "preparing" || tab.status === "queued")
    );
    if (!hasLive) return;
    setTerminalCollapsed(false);
  }, [activeProjectId, tabs]);

  const handleOpenOllamaSettings = useCallback(() => {
    setFileTabs((prev) => {
      if (prev.some((t) => t.key === OLLAMA_SETTINGS_TAB_KEY)) return prev;
      return [
        ...prev,
        {
          kind: "ollama-settings",
          key: OLLAMA_SETTINGS_TAB_KEY,
          bucket: "",
          name: "Ollama ayarları",
          content: "",
          dirty: false,
        },
      ];
    });
    setActiveFileKey(OLLAMA_SETTINGS_TAB_KEY);
  }, []);

  const handleOpenFile = useCallback((node: FileNode, bucket: string) => {
    if (isGdsFile(node.key, node.ext)) {
      setFileTabs((prev) => {
        if (prev.some((t) => t.key === node.key)) return prev;
        return [
          ...prev,
          {
            kind: "gds-viewer",
            key: node.key,
            bucket,
            name: node.name,
            content: "",
            dirty: false,
          },
        ];
      });
      setActiveFileKey(node.key);
      return;
    }
    if (isVcdFile(node.key, node.ext)) {
      setFileTabs((prev) => {
        if (prev.some((t) => t.key === node.key && t.bucket === bucket)) return prev;
        return [
          ...prev,
          {
            kind: "vcd-viewer",
            key: node.key,
            bucket,
            name: node.name,
            content: "",
            dirty: false,
          },
        ];
      });
      setActiveFileKey(node.key);
      return;
    }
    if (!isTextFile(node.ext)) return;

    setFileTabs((prev) => {
      if (prev.some((t) => t.key === node.key && t.bucket === bucket)) return prev;
      return [
        ...prev,
        {
          key: node.key,
          bucket,
          name: node.name,
          content: "",
          dirty: false,
        },
      ];
    });
    setActiveFileKey(node.key);
  }, []);

  const handleOpenWorkspaceFile = useCallback(
    (key: string) => {
      const bucket = projects.find((p) => p.id === activeProjectId)?.bucket;
      if (!bucket) return;
      const name = key.split("/").pop() ?? key;
      const ext = name.includes(".") ? name.split(".").pop() : undefined;
      handleOpenFile({ name, type: "file", key, ext }, bucket);
    },
    [activeProjectId, handleOpenFile, projects]
  );

  const handleTabClose = useCallback((key: string) => {
    setFileTabs((prev) => {
      const tab = prev.find((t) => t.key === key);
      if (tab?.dirty && tab.kind === "ollama-settings") {
        const ok = window.confirm("Kaydedilmemiş Ollama ayarları var. Sekmeyi kapatmak istiyor musunuz?");
        if (!ok) return prev;
      }
      const idx = prev.findIndex((t) => t.key === key);
      const next = prev.filter((t) => t.key !== key);
      setActiveFileKey((ak) => {
        if (ak !== key) return ak;
        const adjacent = next[idx] ?? next[idx - 1];
        return adjacent?.key ?? null;
      });
      return next;
    });
  }, []);

  const handleTabUpdate = useCallback((key: string, patch: Partial<FileTab>) => {
    setFileTabs((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }, []);

  const handleOllamaDirtyChange = useCallback((dirty: boolean) => {
    handleTabUpdate(OLLAMA_SETTINGS_TAB_KEY, { dirty });
  }, [handleTabUpdate]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? projects[0];
  const activeTab = fileTabs.find((t) => t.key === activeFileKey);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1e1e]">
      <Sidebar
        activeProjectId={activeProjectId}
        width={layout.sidebarWidth}
        onProjectChange={onProjectChange}
        onOpenFile={handleOpenFile}
        onOpenOllamaSettings={handleOpenOllamaSettings}
      />

      <ResizeHandle direction="horizontal" onResize={resizeSidebar} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        {!agentOpen && (
          <button
            type="button"
            onClick={() => setAgentOpen(true)}
            className="absolute right-0 top-1/2 z-20 flex h-20 w-5 -translate-y-1/2 items-center justify-center rounded-l border border-r-0 border-white/10 bg-[#252526] text-slate-500 shadow-lg transition-colors hover:bg-[#323232] hover:text-violet-400"
            title="AI panelini aç"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        )}

        <EditorTabBar
          fileTabs={fileTabs}
          activeFileKey={activeFileKey}
          onSelectFile={setActiveFileKey}
          onFileTabClose={handleTabClose}
        />

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {fileTabs.length > 0 && activeFileKey ? (
              activeTab?.kind === "ollama-settings" ? (
                <OllamaSettingsEditor onDirtyChange={handleOllamaDirtyChange} />
              ) : activeTab?.kind === "tool-run" && activeTab.toolRun ? (
                <ToolRunPreviewEditor
                  toolRun={activeTab.toolRun}
                  onOpenFile={handleOpenWorkspaceFile}
                  onToolRunChange={(patch) =>
                    handleToolRunChange(activeTab.toolRun!.runId, patch)
                  }
                />
              ) : activeTab?.kind === "autonom-workshop" && activeTab.autonomWorkshop ? (
                <AutonomWorkshopPane
                  workshop={activeTab.autonomWorkshop}
                  onChange={(patch) =>
                    handleAutonomWorkshopChange(activeTab.autonomWorkshop!.runId, patch)
                  }
                />
              ) : (
                <FileEditorTabs
                  tabs={fileTabs.filter(
                    (t) =>
                      t.kind !== "ollama-settings" &&
                      t.kind !== "tool-run" &&
                      t.kind !== "autonom-workshop"
                  )}
                  activeKey={activeFileKey}
                  onTabChange={setActiveFileKey}
                  onTabClose={handleTabClose}
                  onTabUpdate={handleTabUpdate}
                  showTabBar={false}
                />
              )
            ) : (
              <EmptyEditor />
            )}
          </div>

          {!terminalCollapsed && (
            <ResizeHandle direction="vertical" invert onResize={resizeTerminal} />
          )}

          <div
            className={cn(
              "flex flex-shrink-0 flex-col overflow-hidden border-t border-white/10",
              terminalCollapsed && "h-auto"
            )}
            style={terminalCollapsed ? undefined : { height: layout.terminalHeight }}
          >
            <WorkspaceTerminal
              projectId={activeProjectId}
              collapsed={terminalCollapsed}
              onToggleCollapsed={() => setTerminalCollapsed((c) => !c)}
              onOpenWorkspaceFile={handleOpenWorkspaceFile}
            />
          </div>
        </div>
      </div>

      {agentOpen && (
        <ResizeHandle direction="horizontal" invert onResize={resizeAgentPanel} />
      )}

      <div
        className={cn(
          "flex flex-shrink-0 flex-col overflow-hidden border-l border-white/10",
          !agentOpen && "w-0 min-w-0 border-l-0"
        )}
        style={agentOpen ? { width: layout.agentPanelWidth } : undefined}
      >
        {agentOpen && (
          <AgentPanel
            key={activeProjectId}
            projectId={activeProjectId}
            projectBucket={activeProject?.bucket ?? ""}
            projectName={activeProject?.name ?? ""}
            onClose={() => setAgentOpen(false)}
            onOpenWorkspaceFile={handleOpenWorkspaceFile}
          />
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [agentOpen, setAgentOpen] = useState(true);

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
  }, []);

  return (
    <TooltipProvider>
      <ActiveJobProvider projectId={activeProjectId}>
        <ChatWorkspaceLayout
          activeProjectId={activeProjectId}
          projects={projects}
          onProjectChange={handleProjectChange}
          agentOpen={agentOpen}
          setAgentOpen={setAgentOpen}
        />
      </ActiveJobProvider>
    </TooltipProvider>
  );
}

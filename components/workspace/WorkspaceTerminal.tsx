"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Terminal as TerminalIcon,
  Square,
  Trash2,
  Download,
  CircleDot,
  Loader2,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveJob } from "@/lib/active-job-context";
import { getJobLog } from "@/lib/job-client";
import {
  closeHostShellSession,
  createHostShellSession,
  getHostTerminalStatus,
  type HostTerminalStatus,
} from "@/lib/terminal-shell-client";
import InteractiveShellPane from "@/components/workspace/InteractiveShellPane";
import type { JobStatus } from "@/lib/types";

interface WorkspaceTerminalProps {
  projectId?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenWorkspaceFile?: (key: string) => void;
}

type TerminalSurface =
  | { kind: "job"; jobId: string }
  | { kind: "shell"; sessionId: string };

interface ShellTabState {
  sessionId: string;
  projectId: string;
  label: string;
}

const STATUS_PILL: Record<JobStatus | "preparing", { label: string; klass: string; icon: React.ReactNode }> = {
  queued: {
    label: "Sırada",
    klass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    icon: <CircleDot className="h-2.5 w-2.5" />,
  },
  preparing: {
    label: "Hazırlanıyor",
    klass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    icon: <Loader2 className="h-2.5 w-2.5 animate-spin" />,
  },
  running: {
    label: "Çalışıyor",
    klass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    icon: <Loader2 className="h-2.5 w-2.5 animate-spin" />,
  },
  done: {
    label: "Bitti",
    klass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    icon: <CircleDot className="h-2.5 w-2.5" />,
  },
  failed: {
    label: "Hata",
    klass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    icon: <CircleDot className="h-2.5 w-2.5" />,
  },
  cancelled: {
    label: "İptal",
    klass: "bg-slate-500/15 text-slate-300 border-slate-500/30",
    icon: <CircleDot className="h-2.5 w-2.5" />,
  },
};

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
}

function jobTabLabel(action: string, jobId: string): string {
  return `${action} · ${jobId.slice(0, 6)}`;
}

export default function WorkspaceTerminal({
  projectId,
  collapsed,
  onToggleCollapsed,
  onOpenWorkspaceFile,
}: WorkspaceTerminalProps) {
  const { tabs, activeTabId, active, setActiveTab, cancel, closeTab, clear } = useActiveJob();
  const visibleJobTabs = useMemo(
    () => (projectId ? tabs.filter((tab) => tab.projectId === projectId) : tabs),
    [projectId, tabs]
  );
  const [shellTabs, setShellTabs] = useState<ShellTabState[]>([]);
  const [activeSurface, setActiveSurface] = useState<TerminalSurface | null>(null);
  const [hostTerminal, setHostTerminal] = useState<HostTerminalStatus | null>(null);
  const [openingShell, setOpeningShell] = useState(false);
  const [shellError, setShellError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [now, setNow] = useState(Date.now());

  const visibleShellTabs = useMemo(
    () => (projectId ? shellTabs.filter((tab) => tab.projectId === projectId) : shellTabs),
    [projectId, shellTabs]
  );

  const activeJob = useMemo(() => {
    if (activeSurface?.kind !== "job") return active;
    return visibleJobTabs.find((tab) => tab.jobId === activeSurface.jobId) ?? active;
  }, [active, activeSurface, visibleJobTabs]);

  const activeShellId = activeSurface?.kind === "shell" ? activeSurface.sessionId : null;
  const showingShell = activeSurface?.kind === "shell";

  useEffect(() => {
    void getHostTerminalStatus()
      .then(setHostTerminal)
      .catch(() => setHostTerminal({ available: false, mode: "disabled" }));
  }, []);

  useEffect(() => {
    if (activeSurface) return;
    if (activeTabId) {
      setActiveSurface({ kind: "job", jobId: activeTabId });
      return;
    }
    if (visibleJobTabs[0]) {
      setActiveSurface({ kind: "job", jobId: visibleJobTabs[0].jobId });
    }
  }, [activeSurface, activeTabId, visibleJobTabs]);

  useEffect(() => {
    if (!stickToBottom || showingShell) return;
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeJob?.lines.length, activeJob?.notes.length, collapsed, stickToBottom, activeSurface, showingShell]);

  useEffect(() => {
    if (!activeJob || activeJob.finishedAt || showingShell) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [activeJob, showingShell]);

  const isLive = Boolean(
    activeJob &&
      !showingShell &&
      !activeJob.finishedAt &&
      (activeJob.status === "running" || activeJob.status === "preparing" || activeJob.status === "queued")
  );

  const liveCount = visibleJobTabs.filter(
    (tab) =>
      !tab.finishedAt &&
      (tab.status === "running" || tab.status === "preparing" || tab.status === "queued")
  ).length;

  const elapsed = useMemo(() => {
    if (!activeJob) return 0;
    const end = activeJob.finishedAt ?? now;
    return end - activeJob.startedAt;
  }, [activeJob, now]);

  const removeShellTab = useCallback((sessionId: string) => {
    setShellTabs((prev) => prev.filter((tab) => tab.sessionId !== sessionId));
    setActiveSurface((prev) => {
      if (prev?.kind === "shell" && prev.sessionId === sessionId) {
        return null;
      }
      return prev;
    });
  }, []);

  const closeShellTab = useCallback(
    async (sessionId: string) => {
      removeShellTab(sessionId);
      try {
        await closeHostShellSession(sessionId);
      } catch {
        // oturum zaten kapanmış olabilir
      }
    },
    [removeShellTab]
  );

  const openShellTab = useCallback(async () => {
    if (!projectId || !hostTerminal?.available) return;
    setShellError(null);
    setOpeningShell(true);
    try {
      const session = await createHostShellSession(projectId);
      const label =
        hostTerminal.mode === "host"
          ? `host ${hostTerminal.shell ?? "bash"} · ${session.session_id.slice(0, 6)}`
          : `shell · ${session.session_id.slice(0, 6)}`;
      setShellTabs((prev) => [
        ...prev,
        { sessionId: session.session_id, projectId: session.project_id, label },
      ]);
      setActiveSurface({ kind: "shell", sessionId: session.session_id });
    } catch (error) {
      setShellError(error instanceof Error ? error.message : String(error));
    } finally {
      setOpeningShell(false);
    }
  }, [hostTerminal, projectId]);

  async function downloadLog() {
    if (!activeJob) return;
    try {
      const text = await getJobLog(activeJob.jobId);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeJob.action}-${activeJob.jobId.slice(0, 8)}.log`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // log henüz upload edilmemiş olabilir
    }
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < 32);
  }

  const totalTabCount = visibleJobTabs.length + visibleShellTabs.length;
  const status = activeJob && !showingShell ? STATUS_PILL[activeJob.status] : null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex w-full items-center gap-2 border-t border-white/10 bg-[#1a1f26] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:bg-white/5 hover:text-slate-400"
      >
        <TerminalIcon className="h-3 w-3" />
        <span>Terminal</span>
        {totalTabCount > 0 && (
          <span className="rounded-full border border-white/10 px-1.5 py-px text-[9px] tracking-normal normal-case text-slate-400">
            {totalTabCount} sekme{liveCount > 0 ? ` · ${liveCount} canlı` : ""}
          </span>
        )}
        {activeJob && status && !showingShell && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] tracking-normal normal-case",
              status.klass
            )}
          >
            {status.icon}
            {status.label} • {activeJob.action}
          </span>
        )}
        {showingShell && (
          <span className="rounded-full border border-emerald-500/30 px-1.5 py-px text-[9px] tracking-normal normal-case text-emerald-300">
            kabuk
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          göster
          <ChevronUp className="h-3 w-3" />
        </span>
      </button>
    );
  }

  return (
    <div className="relative flex h-full min-h-[120px] flex-col border-t border-white/10 bg-[#1a1f26]">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#161b22] px-2 py-1">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <TerminalIcon className="h-3 w-3 text-emerald-500/80" />
          <span>Terminal</span>
          {showingShell ? (
            <span className="ml-2 rounded-full border border-emerald-500/30 px-2 py-px text-[10px] font-medium tracking-normal normal-case text-emerald-300">
              {hostTerminal?.mode === "host" ? "Host kabuğu" : "Kabuk"}
            </span>
          ) : (
            activeJob &&
            status && (
              <>
                <span
                  className={cn(
                    "ml-2 flex items-center gap-1 rounded-full border px-2 py-px text-[10px] font-medium tracking-normal normal-case",
                    status.klass
                  )}
                >
                  {status.icon}
                  {status.label}
                </span>
                <span className="ml-2 text-slate-500 normal-case tracking-normal">
                  <span className="text-slate-300">{activeJob.action}</span>
                  {activeJob.exitCode !== null && (
                    <span className="ml-1.5 text-slate-600">exit {activeJob.exitCode}</span>
                  )}
                </span>
                <span className="text-slate-600 normal-case tracking-normal">• {formatDuration(elapsed)}</span>
              </>
            )
          )}
        </div>
        <div className="flex items-center gap-1">
          {hostTerminal?.available && projectId && (
            <button
              type="button"
              onClick={() => void openShellTab()}
              disabled={openingShell}
              className="flex h-6 items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
              title={
                hostTerminal.mode === "host"
                  ? "Host üzerinde yeni etkileşimli kabuk sekmesi aç"
                  : "Yeni etkileşimli kabuk sekmesi aç"
              }
            >
              {openingShell ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
              Kabuk
            </button>
          )}
          {isLive && (
            <button
              type="button"
              onClick={() => void cancel()}
              className="flex h-6 items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 text-[10px] font-medium text-rose-300 hover:bg-rose-500/15"
              title="Aktif job sekmesine SIGINT (Ctrl+C) gönder"
            >
              <Square className="h-2.5 w-2.5" />
              İptal
            </button>
          )}
          {!showingShell && activeJob && activeJob.finishedAt !== null && (
            <button
              type="button"
              onClick={() => void downloadLog()}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-slate-300"
              title="Log indir"
            >
              <Download className="h-3 w-3" />
            </button>
          )}
          {(showingShell || activeJob) && (
            <button
              type="button"
              onClick={() => {
                if (showingShell && activeShellId) {
                  void closeShellTab(activeShellId);
                  return;
                }
                void clear();
              }}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-slate-300"
              title="Aktif sekmeyi kapat"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-slate-300"
            title="Paneli küçült"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {totalTabCount > 0 && (
        <div className="flex flex-shrink-0 items-end overflow-x-auto border-b border-white/8 bg-[#14181f]">
          {visibleJobTabs.map((tab) => {
            const live =
              !tab.finishedAt &&
              (tab.status === "running" || tab.status === "preparing" || tab.status === "queued");
            const selected = activeSurface?.kind === "job" && activeSurface.jobId === tab.jobId;
            return (
              <div
                key={`job-${tab.jobId}`}
                className={cn(
                  "group flex max-w-[220px] flex-shrink-0 items-center gap-1 border-r border-white/[0.06] px-2 py-1.5 text-[11px]",
                  selected ? "bg-[#1a1f26] text-slate-100" : "bg-[#10141a] text-slate-400 hover:bg-[#161b22]"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.jobId);
                    setActiveSurface({ kind: "job", jobId: tab.jobId });
                  }}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                      live ? "bg-amber-400" : tab.status === "failed" ? "bg-rose-400" : "bg-slate-600"
                    )}
                  />
                  <span className="truncate">{jobTabLabel(tab.action, tab.jobId)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void closeTab(tab.jobId)}
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-slate-500 hover:bg-white/10 hover:text-slate-200",
                    !selected && "opacity-0 group-hover:opacity-100"
                  )}
                  title="Sekmeyi kapat"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {visibleShellTabs.map((tab) => {
            const selected = activeSurface?.kind === "shell" && activeSurface.sessionId === tab.sessionId;
            return (
              <div
                key={`shell-${tab.sessionId}`}
                className={cn(
                  "group flex max-w-[220px] flex-shrink-0 items-center gap-1 border-r border-white/[0.06] px-2 py-1.5 text-[11px]",
                  selected ? "bg-[#1a1f26] text-slate-100" : "bg-[#10141a] text-slate-400 hover:bg-[#161b22]"
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveSurface({ kind: "shell", sessionId: tab.sessionId })}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span className="truncate">{tab.label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void closeShellTab(tab.sessionId)}
                  className={cn(
                    "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-slate-500 hover:bg-white/10 hover:text-slate-200",
                    !selected && "opacity-0 group-hover:opacity-100"
                  )}
                  title="Kabuk sekmesini kapat"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {shellError && (
        <div className="border-b border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200">
          {shellError}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {visibleShellTabs.map((tab) => (
          <div
            key={tab.sessionId}
            className={cn("absolute inset-0", activeShellId === tab.sessionId ? "z-10" : "pointer-events-none opacity-0")}
          >
            <InteractiveShellPane
              sessionId={tab.sessionId}
              active={activeShellId === tab.sessionId}
              onClosed={() => removeShellTab(tab.sessionId)}
            />
          </div>
        ))}

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={cn(
            "h-full overflow-y-auto p-2 font-mono text-[11px] leading-relaxed text-slate-400",
            showingShell && "pointer-events-none opacity-0"
          )}
        >
          {!activeJob && !showingShell && (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-600">
              <TerminalIcon className="h-5 w-5" />
              <p className="text-xs">Henüz çalıştırılan bir araç yok.</p>
              <p className="text-[11px] text-center">
                Sağ panelden araç çalıştırın veya{" "}
                {hostTerminal?.available ? (
                  <span className="text-slate-400">Kabuk</span>
                ) : (
                  "terminal"
                )}{" "}
                ile yeni bir oturum açın.
              </p>
            </div>
          )}

          {activeJob && (
            <>
              <div className="mb-1 text-[10px] text-slate-600">
                <span className="text-slate-500">job</span> {activeJob.jobId.slice(0, 12)}{" "}
                <span className="text-slate-700">|</span>{" "}
                <span className="text-slate-500">project</span> {activeJob.projectId}
              </div>
              {activeJob.notes.map((n, i) => (
                <div key={`n-${i}`} className="text-sky-400/80">
                  → {n}
                </div>
              ))}
              {activeJob.lines.map((l, i) => (
                <div
                  key={`l-${i}`}
                  className={cn(
                    "whitespace-pre-wrap break-all",
                    l.stream === "stderr" && "text-rose-300/90",
                    l.stream === "system" && "text-amber-400/80",
                    l.stream === "stdout" && "text-slate-300"
                  )}
                >
                  {l.line}
                </div>
              ))}
              {activeJob.finishedAt !== null && (
                <div
                  className={cn(
                    "mt-2 space-y-1 text-[10px]",
                    activeJob.status === "done" && "text-emerald-400",
                    activeJob.status === "failed" && "text-rose-400",
                    activeJob.status === "cancelled" && "text-slate-500"
                  )}
                >
                  <div>
                    — bitti ({activeJob.status}, exit={activeJob.exitCode ?? "?"}, {formatDuration(elapsed)})
                  </div>
                  {activeJob.logObjectKey && (
                    <div className="text-slate-500">
                      workspace:{" "}
                      {onOpenWorkspaceFile ? (
                        <button
                          type="button"
                          onClick={() => onOpenWorkspaceFile(activeJob.logObjectKey!)}
                          className="text-violet-300 hover:text-violet-200"
                        >
                          {activeJob.logObjectKey}
                        </button>
                      ) : (
                        <span className="text-slate-400">{activeJob.logObjectKey}</span>
                      )}
                    </div>
                  )}
                  {activeJob.artifactsPrefix && (
                    <div className="text-slate-500">
                      çıktılar: <span className="text-slate-400">{activeJob.artifactsPrefix}/</span>
                    </div>
                  )}
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </div>

      {!stickToBottom && activeJob && !showingShell && (
        <button
          type="button"
          onClick={() => {
            setStickToBottom(true);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-2 right-3 rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-1 text-[10px] font-medium text-violet-300 shadow-lg hover:bg-violet-500/25"
        >
          ↓ Sona git
        </button>
      )}
    </div>
  );
}

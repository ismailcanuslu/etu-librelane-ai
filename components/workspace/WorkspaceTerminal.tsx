"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Terminal as TerminalIcon,
  Square,
  Trash2,
  Download,
  CircleDot,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveJob } from "@/lib/active-job-context";
import { getJobLog } from "@/lib/job-client";
import type { JobStatus } from "@/lib/types";

interface WorkspaceTerminalProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenWorkspaceFile?: (key: string) => void;
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

export default function WorkspaceTerminal({
  collapsed,
  onToggleCollapsed,
  onOpenWorkspaceFile,
}: WorkspaceTerminalProps) {
  const { active, cancel, clear } = useActiveJob();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [now, setNow] = useState(Date.now());

  // Otomatik kaydırma — kullanıcı yukarı kaydırmazsa altta kal
  useEffect(() => {
    if (!stickToBottom) return;
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [active?.lines.length, active?.notes.length, collapsed, stickToBottom]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStickToBottom(distanceFromBottom < 32);
  }

  // Aktif job çalışırken her saniye süre güncelle
  useEffect(() => {
    if (!active || active.finishedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active]);

  const isLive = !!active && !active.finishedAt && (active.status === "running" || active.status === "preparing" || active.status === "queued");

  const elapsed = useMemo(() => {
    if (!active) return 0;
    const end = active.finishedAt ?? now;
    return end - active.startedAt;
  }, [active, now]);

  async function downloadLog() {
    if (!active) return;
    try {
      const text = await getJobLog(active.jobId);
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${active.action}-${active.jobId.slice(0, 8)}.log`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // sessizce başarısız ol — log henüz upload edilmemiş olabilir
    }
  }

  if (collapsed) {
    const status = active ? STATUS_PILL[active.status] : null;
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        className="flex w-full items-center gap-2 border-t border-white/10 bg-[#1a1f26] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 hover:bg-white/5 hover:text-slate-400"
      >
        <TerminalIcon className="h-3 w-3" />
        <span>Terminal</span>
        {active && status && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-1.5 py-px text-[9px] tracking-normal normal-case",
              status.klass
            )}
          >
            {status.icon}
            {status.label} • {active.action}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1">
          göster
          <ChevronUp className="h-3 w-3" />
        </span>
      </button>
    );
  }

  const status = active ? STATUS_PILL[active.status] : null;

  return (
    <div className="relative flex h-full min-h-[120px] flex-col border-t border-white/10 bg-[#1a1f26]">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#161b22] px-2 py-1">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          <TerminalIcon className="h-3 w-3 text-emerald-500/80" />
          <span>Terminal</span>
          {active && status && (
            <span
              className={cn(
                "ml-2 flex items-center gap-1 rounded-full border px-2 py-px text-[10px] font-medium tracking-normal normal-case",
                status.klass
              )}
            >
              {status.icon}
              {status.label}
            </span>
          )}
          {active && (
            <>
              <span className="ml-2 text-slate-500 normal-case tracking-normal">
                <span className="text-slate-300">{active.action}</span>
                {active.exitCode !== null && (
                  <span className="ml-1.5 text-slate-600">exit {active.exitCode}</span>
                )}
              </span>
              <span className="text-slate-600 normal-case tracking-normal">• {formatDuration(elapsed)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isLive && (
            <button
              type="button"
              onClick={() => cancel()}
              className="flex h-6 items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 text-[10px] font-medium text-rose-300 hover:bg-rose-500/15"
              title="Job'u iptal et"
            >
              <Square className="h-2.5 w-2.5" />
              İptal
            </button>
          )}
          {active && active.finishedAt !== null && (
            <button
              type="button"
              onClick={downloadLog}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-slate-300"
              title="Log indir"
            >
              <Download className="h-3 w-3" />
            </button>
          )}
          {active && (
            <button
              type="button"
              onClick={clear}
              className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-slate-300"
              title="Temizle"
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

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed text-slate-400"
      >
        {!active && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-600">
            <TerminalIcon className="h-5 w-5" />
            <p className="text-xs">Henüz çalıştırılan bir araç yok.</p>
            <p className="text-[11px]">
              Sağ panelden bir araç (RTL Lint, Smoke Test, vb.) seç ve <span className="text-slate-400">Çalıştır</span>'a bas.
            </p>
          </div>
        )}

        {active && (
          <>
            <div className="mb-1 text-[10px] text-slate-600">
              <span className="text-slate-500">job</span> {active.jobId.slice(0, 12)} <span className="text-slate-700">|</span>{" "}
              <span className="text-slate-500">project</span> {active.projectId}
            </div>
            {active.notes.map((n, i) => (
              <div key={`n-${i}`} className="text-sky-400/80">→ {n}</div>
            ))}
            {active.lines.map((l, i) => (
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
            {active.finishedAt !== null && (
              <div
                className={cn(
                  "mt-2 space-y-1 text-[10px]",
                  active.status === "done" && "text-emerald-400",
                  active.status === "failed" && "text-rose-400",
                  active.status === "cancelled" && "text-slate-500"
                )}
              >
                <div>
                  — bitti ({active.status}, exit={active.exitCode ?? "?"}, {formatDuration(elapsed)})
                </div>
                {active.logObjectKey && (
                  <div className="text-slate-500">
                    workspace:{" "}
                    {onOpenWorkspaceFile ? (
                      <button
                        type="button"
                        onClick={() => onOpenWorkspaceFile(active.logObjectKey!)}
                        className="text-violet-300 hover:text-violet-200"
                      >
                        {active.logObjectKey}
                      </button>
                    ) : (
                      <span className="text-slate-400">{active.logObjectKey}</span>
                    )}
                  </div>
                )}
                {active.artifactsPrefix && (
                  <div className="text-slate-500">
                    çıktılar: <span className="text-slate-400">{active.artifactsPrefix}/</span>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {!stickToBottom && active && (
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

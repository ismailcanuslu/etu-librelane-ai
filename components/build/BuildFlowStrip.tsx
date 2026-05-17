"use client";

import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILD_FLOW_ORDER, TAPEOUT_FOLLOWUP_STEP } from "@/lib/build-flow";
import { useActiveJob } from "@/lib/active-job-context";
import { openToolRunPreview } from "@/lib/run-tool-with-preview";
import type { ToolSpec } from "@/lib/types";

export function BuildFlowStrip({
  projectId,
  projectName,
  tools,
  enabledTools,
  onOpenWorkspaceFile,
}: {
  projectId: string;
  projectName: string;
  tools: ToolSpec[];
  enabledTools: Set<string>;
  onOpenWorkspaceFile?: (key: string) => void;
}) {
  const { active } = useActiveJob();
  const [runningId, setRunningId] = useState<string | null>(null);

  const flowSteps = useMemo(() => {
    const byId = new Map(tools.map((t) => [t.id, t]));
    return BUILD_FLOW_ORDER.map((id) => byId.get(id)).filter((t): t is ToolSpec => Boolean(t));
  }, [tools]);

  const completedIdx = active ? flowSteps.findIndex((o) => o.id === active.action) : -1;

  async function runStep(actionId: string) {
    if (!projectId || !enabledTools.has(actionId) || runningId) return;
    setRunningId(actionId);
    try {
      await openToolRunPreview(projectId, actionId);
    } finally {
      setRunningId(null);
    }
  }

  const flowTool = flowSteps.find((t) => t.id === "openlane1-flow");

  return (
    <div className="mb-1 space-y-2 rounded-lg border border-white/8 bg-white/3 p-3">
      <div>
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
          {projectName} — RTL + wrapper layout (adım 5 = wrapper GDS, tape-out değil)
        </p>
        <p className="text-[10px] leading-relaxed text-slate-600">
          1–4: doğrulama · 5: OpenLane → <span className="text-sky-400/90">user_project_wrapper</span> GDS ·
          5.1: tam çip tape-out (Caravel + IO pad, web dışı)
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {flowSteps.map((tool, i) => {
          const enabled = enabledTools.has(tool.id);
          const isRunning =
            runningId === tool.id || (active?.action === tool.id && !active.finishedAt);
          const isFlow = tool.id === "openlane1-flow";
          const displayLabel = isFlow ? "Flow (wrapper GDS)" : tool.label;
          return (
            <div key={tool.id} className="flex items-center gap-1">
              <button
                type="button"
                disabled={!projectId || !enabled || Boolean(runningId)}
                onClick={() => void runStep(tool.id)}
                title={
                  isFlow
                    ? "user_project_wrapper layout — GDS üretir; tam tape-out çipi değildir"
                    : tool.description
                }
                className={cn(
                  "flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-colors",
                  isRunning && "animate-pulse border-amber-500/30 bg-amber-500/20 text-amber-400",
                  !isRunning &&
                    active &&
                    completedIdx === i &&
                    active.finishedAt &&
                    active.status === "done" &&
                    "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
                  isFlow &&
                    !isRunning &&
                    "border-amber-500/25 bg-amber-500/10 text-amber-200 hover:border-amber-500/40",
                  enabled &&
                    !isRunning &&
                    !isFlow &&
                    "border-white/10 bg-white/5 text-slate-400 hover:border-violet-500/40 hover:text-violet-200",
                  !enabled && "cursor-not-allowed border-white/5 bg-white/3 text-slate-700"
                )}
              >
                <span>{i + 1}</span>
                <span className="max-w-[110px] truncate">{displayLabel}</span>
              </button>
              {i < flowSteps.length - 1 && (
                <ArrowRight className="h-3 w-3 flex-shrink-0 text-slate-700" />
              )}
            </div>
          );
        })}

        <ArrowRight className="mx-0.5 h-3 w-3 flex-shrink-0 text-slate-600" />

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
          <span
            className="flex h-6 items-center gap-1 rounded-full border border-violet-500/35 bg-violet-500/10 px-2 text-[10px] font-medium text-violet-200"
            title={TAPEOUT_FOLLOWUP_STEP.description}
          >
            <span>{TAPEOUT_FOLLOWUP_STEP.stepLabel}</span>
            <span className="max-w-[140px] truncate">{TAPEOUT_FOLLOWUP_STEP.shortTitle}</span>
          </span>
          {onOpenWorkspaceFile ? (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onOpenWorkspaceFile(TAPEOUT_FOLLOWUP_STEP.guideFile)}
                className="flex h-6 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 text-[10px] text-slate-400 hover:border-violet-500/40 hover:text-violet-200"
                title="Tape-out rehberi (GDS ≠ tape-out)"
              >
                <BookOpen className="h-3 w-3" />
                guide.md
              </button>
              <button
                type="button"
                onClick={() => onOpenWorkspaceFile(TAPEOUT_FOLLOWUP_STEP.harnessReadme)}
                className="flex h-6 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 text-[10px] text-slate-400 hover:border-violet-500/40 hover:text-violet-200"
                title="Caravel harness entegrasyonu"
              >
                <ExternalLink className="h-3 w-3" />
                caravel/
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {flowTool ? (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2.5 py-2 text-[10px] leading-relaxed text-amber-100/90">
          <strong className="text-amber-200">Adım 5:</strong>{" "}
          <code className="text-amber-100/80">verilog/rtl/user_project_wrapper.v</code> +{" "}
          <code className="text-amber-100/80">openlane/user_project_wrapper/config.json</code> ile çalışır.
          Çıkan GDS yalnızca Caravel user alanıdır.{" "}
          <strong className="text-violet-200">Adım 5.1:</strong> IO pad wrapper + harness ile tam çip tape-out —{" "}
          <span className="text-slate-400">guide.md § Web 5 + 5.1</span>
        </p>
      ) : null}
    </div>
  );
}

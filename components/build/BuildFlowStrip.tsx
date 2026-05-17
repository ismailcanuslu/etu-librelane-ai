"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILD_FLOW_ORDER } from "@/lib/build-flow";
import { useActiveJob } from "@/lib/active-job-context";
import { runToolWithPreview } from "@/lib/run-tool-with-preview";
import type { ToolSpec } from "@/lib/types";

export function BuildFlowStrip({
  projectId,
  projectName,
  tools,
  enabledTools,
}: {
  projectId: string;
  projectName: string;
  tools: ToolSpec[];
  enabledTools: Set<string>;
}) {
  const { active, start } = useActiveJob();
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
      await runToolWithPreview(projectId, actionId, start);
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="mb-1 rounded-lg border border-white/8 bg-white/3 p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {projectName} — 5 aşama (tıkla: önizleme sekmesi + çalıştır)
      </p>
      <div className="flex flex-wrap items-center gap-1">
        {flowSteps.map((tool, i) => {
          const enabled = enabledTools.has(tool.id);
          const isRunning =
            runningId === tool.id || (active?.action === tool.id && !active.finishedAt);
          return (
            <div key={tool.id} className="flex items-center gap-1">
              <button
                type="button"
                disabled={!projectId || !enabled || Boolean(runningId)}
                onClick={() => void runStep(tool.id)}
                className={cn(
                  "flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-colors",
                  isRunning && "animate-pulse border-amber-500/30 bg-amber-500/20 text-amber-400",
                  !isRunning &&
                    active &&
                    completedIdx === i &&
                    active.finishedAt &&
                    active.status === "done" &&
                    "border-emerald-500/30 bg-emerald-500/20 text-emerald-400",
                  enabled &&
                    !isRunning &&
                    "border-white/10 bg-white/5 text-slate-400 hover:border-violet-500/40 hover:text-violet-200",
                  !enabled && "cursor-not-allowed border-white/5 bg-white/3 text-slate-700"
                )}
              >
                <span>{i + 1}</span>
                <span className="max-w-[80px] truncate">{tool.label}</span>
              </button>
              {i < flowSteps.length - 1 && (
                <ArrowRight className="h-3 w-3 flex-shrink-0 text-slate-700" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

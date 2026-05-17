import { OPENLANE_PLACEMENT_PRESET_IDS } from "@/lib/build-flow";
import { fetchRunPreview } from "@/lib/job-client";
import type { RunPreview, ToolRunTabState } from "@/lib/types";
import { requestOpenToolRunTab } from "@/lib/workspace-events";

export type RunToolStartFn = (
  projectId: string,
  action: string,
  options?: {
    designName?: string;
    args?: string[];
    inputFiles?: string[];
    flowSteps?: string[];
  }
) => Promise<{ job_id: string }>;

/** Önizleme sekmesini açar; job başlatmaz — kullanıcı sekmede onaylar. */
export async function openToolRunPreview(
  projectId: string,
  action: string,
  opts?: { runId?: string }
): Promise<{ preview: RunPreview; runId: string }> {
  const runId = opts?.runId ?? `pending-${Date.now()}`;
  const preview = await fetchRunPreview(projectId, action);
  const selectedInputFiles = preview.default_input_files ?? preview.input_files;
  const allFlowIds = preview.default_flow_steps ?? [];
  const placementDefault = allFlowIds.filter((id) =>
    (OPENLANE_PLACEMENT_PRESET_IDS as readonly string[]).includes(id)
  );
  const selectedFlowSteps =
    action === "openlane1-flow" && placementDefault.length > 0
      ? placementDefault
      : preview.selected_flow_steps ?? allFlowIds;
  requestOpenToolRunTab({
    projectId,
    action,
    preview,
    runId,
    selectedInputFiles,
    selectedFlowSteps:
      action === "openlane1-flow" && selectedFlowSteps.length > 0
        ? selectedFlowSteps
        : undefined,
  });
  return { preview, runId };
}

/** Onaylanmış dosya listesiyle job başlatır ve sekmeyi job id ile günceller. */
export async function confirmAndStartToolRun(
  toolRun: ToolRunTabState,
  selectedInputFiles: string[],
  start: RunToolStartFn
): Promise<{ job_id: string }> {
  const runOptions: {
    designName?: string;
    inputFiles: string[];
    args?: string[];
    flowSteps?: string[];
  } = { inputFiles: selectedInputFiles };
  if (toolRun.preview.design_name) {
    runOptions.designName = toolRun.preview.design_name;
  }
  const flowSteps = toolRun.selectedFlowSteps;
  if (toolRun.action === "openlane1-flow" && flowSteps?.length) {
    runOptions.flowSteps = flowSteps;
  }
  const result = await start(toolRun.projectId, toolRun.action, runOptions);
  requestOpenToolRunTab({
    projectId: toolRun.projectId,
    action: toolRun.action,
    preview: toolRun.preview,
    runId: toolRun.runId,
    jobId: result.job_id,
    selectedInputFiles,
    selectedFlowSteps: toolRun.selectedFlowSteps,
  });
  return result;
}

/** @deprecated Doğrudan başlatır; yeni akış için openToolRunPreview + confirmAndStartToolRun kullanın. */
export async function runToolWithPreview(
  projectId: string,
  action: string,
  start: RunToolStartFn,
  opts?: { runId?: string; inputFiles?: string[] }
): Promise<{ job_id: string; preview: RunPreview }> {
  const { preview, runId } = await openToolRunPreview(projectId, action, opts);
  const files = opts?.inputFiles ?? preview.default_input_files ?? preview.input_files;
  const result = await confirmAndStartToolRun(
    { projectId, action, runId, preview, selectedInputFiles: files },
    files,
    start
  );
  return { job_id: result.job_id, preview };
}

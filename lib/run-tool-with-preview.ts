import { fetchRunPreview } from "@/lib/job-client";
import type { RunPreview } from "@/lib/types";
import { requestOpenToolRunTab } from "@/lib/workspace-events";

export type RunToolResult = { job_id: string; preview: RunPreview };

/**
 * Önizleme sekmesi aç → job başlat → sekmeyi job id ile güncelle.
 * Tüm araçlar (build + tools) bu fonksiyonu kullanmalı.
 */
export async function runToolWithPreview(
  projectId: string,
  action: string,
  start: (
    projectId: string,
    action: string,
    options?: { designName?: string; args?: string[] }
  ) => Promise<{ job_id: string }>,
  opts?: { runId?: string }
): Promise<RunToolResult> {
  const runId = opts?.runId ?? `pending-${Date.now()}`;
  const preview = await fetchRunPreview(projectId, action);
  requestOpenToolRunTab({ projectId, action, preview, runId });
  const runOptions = preview.design_name ? { designName: preview.design_name } : undefined;
  const result = await start(projectId, action, runOptions);
  requestOpenToolRunTab({
    projectId,
    action,
    preview,
    runId,
    jobId: result.job_id,
  });
  return { job_id: result.job_id, preview };
}

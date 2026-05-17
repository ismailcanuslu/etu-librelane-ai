/**
 * Job runner istemcisi — backend job'larını başlatır, abone olur, geçmişi listeler.
 * BFF üzerinden /api/run, /api/jobs, /api/tools'a konuşur.
 */

import type {
  Job,
  JobDoneEvent,
  JobErrorEvent,
  JobLineEvent,
  JobStatus,
  JobStatusEvent,
  RunPreview,
  ToolSpec,
} from "./types";

export interface EdaRuntimeInfo {
  pdk: RunPreview["pdk"];
  workspace_root: string;
  jobs_host_dir: string;
  runner_image_openlane: string;
}

const RUN_BASE = "/api/run";
const JOBS_BASE = "/api/jobs";
const TOOLS_BASE = "/api/tools";

function readErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as { error?: string; detail?: string | Array<{ msg?: string }> };
    if (record.error) return record.error;
    if (typeof record.detail === "string") return record.detail;
    if (Array.isArray(record.detail) && record.detail[0]?.msg) return record.detail[0].msg;
  }
  return `HTTP ${status}`;
}

async function asJsonOrThrow<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    throw new Error(readErrorMessage(data, res.status));
  }
  return data;
}

export function parsePersistedJobLog(text: string): JobLineEvent[] {
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(/^\[(stdout|stderr|system)\]\s*(.*)$/);
      if (match) {
        return {
          stream: match[1] as JobLineEvent["stream"],
          line: match[2],
          ts: new Date().toISOString(),
        };
      }
      return {
        stream: "system" as const,
        line,
        ts: new Date().toISOString(),
      };
    });
}

export async function listTools(): Promise<ToolSpec[]> {
  const res = await fetch(TOOLS_BASE, { cache: "no-store" });
  const data = await asJsonOrThrow<{ tools: ToolSpec[] }>(res);
  return data.tools ?? [];
}

export async function fetchEdaRuntime(): Promise<EdaRuntimeInfo> {
  const res = await fetch(`${TOOLS_BASE}/runtime`, { cache: "no-store" });
  return asJsonOrThrow<EdaRuntimeInfo>(res);
}

export async function fetchRunPreview(
  projectId: string,
  action: string,
  options?: { flowSteps?: string[] }
): Promise<RunPreview> {
  if (action === "openlane1-flow" && options?.flowSteps?.length) {
    const res = await fetch(`${TOOLS_BASE}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        action,
        flow_steps: options.flowSteps,
      }),
      cache: "no-store",
    });
    return asJsonOrThrow<RunPreview>(res);
  }
  const params = new URLSearchParams({ project_id: projectId, action });
  const res = await fetch(`${TOOLS_BASE}/preview?${params}`, { cache: "no-store" });
  return asJsonOrThrow<RunPreview>(res);
}

export async function startJob(
  projectId: string,
  action: string,
  options?: {
    designName?: string;
    args?: string[];
    inputFiles?: string[];
    flowSteps?: string[];
  }
): Promise<{ job_id: string }> {
  const body: {
    project_id: string;
    action: string;
    design_name?: string;
    args?: string[];
    input_files?: string[];
    flow_steps?: string[];
  } = { project_id: projectId, action };
  if (options?.designName) body.design_name = options.designName;
  if (options?.args?.length) body.args = options.args;
  if (options?.inputFiles?.length) body.input_files = options.inputFiles;
  if (options?.flowSteps?.length) body.flow_steps = options.flowSteps;

  const res = await fetch(`${RUN_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return asJsonOrThrow<{ job_id: string }>(res);
}

export async function resetAllRunnerJobs(
  projectId?: string
): Promise<{ ok: boolean; cancelled_jobs: number; killed_containers: number }> {
  const res = await fetch(`${RUN_BASE}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectId ? { project_id: projectId } : {}),
  });
  return asJsonOrThrow(res);
}

export async function cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
  const res = await fetch(`${RUN_BASE}/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
  });
  return asJsonOrThrow<{ cancelled: boolean }>(res);
}

export async function listTerminalTabs(projectId?: string): Promise<TerminalTab[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  const query = params.size ? `?${params.toString()}` : "";
  const res = await fetch(`${RUN_BASE}/terminals${query}`, { cache: "no-store" });
  const data = await asJsonOrThrow<{ tabs: TerminalTab[] }>(res);
  return data.tabs ?? [];
}

export async function openTerminalTab(jobId: string): Promise<{ job_id: string }> {
  const res = await fetch(`${RUN_BASE}/terminals/${encodeURIComponent(jobId)}`, {
    method: "POST",
  });
  return asJsonOrThrow<{ job_id: string }>(res);
}

export async function closeTerminalTab(jobId: string): Promise<{ closed: boolean }> {
  const res = await fetch(`${RUN_BASE}/terminals/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
  });
  return asJsonOrThrow<{ closed: boolean }>(res);
}

export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${JOBS_BASE}/${encodeURIComponent(jobId)}`, { cache: "no-store" });
  return asJsonOrThrow<Job>(res);
}

export async function listJobs(projectId?: string, limit = 50, offset = 0): Promise<Job[]> {
  const params = new URLSearchParams();
  if (projectId) params.set("project_id", projectId);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await fetch(`${JOBS_BASE}?${params}`, { cache: "no-store" });
  const data = await asJsonOrThrow<{ jobs: Job[] }>(res);
  return data.jobs ?? [];
}

export async function getJobLog(jobId: string): Promise<string> {
  const res = await fetch(`${JOBS_BASE}/${encodeURIComponent(jobId)}/log`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

// ─── SSE subscription ────────────────────────────────────────────────────────

export interface JobSubscription {
  close(): void;
}

export interface TerminalTab {
  job_id: string;
  project_id: string;
  action: string;
  status: JobStatus;
  exit_code: number | null;
  opened_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface JobSubscribers {
  onSnapshot?: (data: { status: string; exit_code: number | null; action: string; image: string }) => void;
  onStatus?: (data: JobStatusEvent) => void;
  onLine?: (data: JobLineEvent) => void;
  onDone?: (data: JobDoneEvent) => void;
  onError?: (data: JobErrorEvent) => void;
  onOpen?: () => void;
  onClosed?: () => void;
}

export function subscribeJob(jobId: string, handlers: JobSubscribers): JobSubscription {
  const url = `${RUN_BASE}/${encodeURIComponent(jobId)}/stream`;
  const es = new EventSource(url);

  es.addEventListener("open", () => {
    handlers.onOpen?.();
  });

  function tryParse<T>(raw: string): T | null {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  es.addEventListener("snapshot", (e: MessageEvent) => {
    const d = tryParse<{ status: string; exit_code: number | null; action: string; image: string }>(e.data);
    if (d) handlers.onSnapshot?.(d);
  });

  es.addEventListener("status", (e: MessageEvent) => {
    const d = tryParse<JobStatusEvent>(e.data);
    if (d) handlers.onStatus?.(d);
  });

  es.addEventListener("line", (e: MessageEvent) => {
    const d = tryParse<JobLineEvent>(e.data);
    if (d) handlers.onLine?.(d);
  });

  es.addEventListener("done", (e: MessageEvent) => {
    const d = tryParse<JobDoneEvent>(e.data);
    if (d) handlers.onDone?.(d);
    es.close();
    handlers.onClosed?.();
  });

  es.addEventListener("error", (e: Event) => {
    const me = e as MessageEvent;
    const d = me.data ? tryParse<JobErrorEvent>(me.data as string) : null;
    if (d) handlers.onError?.(d);
    // EventSource auto-reconnect; net hatası ise readyState=CLOSED
    if (es.readyState === EventSource.CLOSED) {
      handlers.onClosed?.();
    }
  });

  return {
    close() {
      es.close();
      handlers.onClosed?.();
    },
  };
}

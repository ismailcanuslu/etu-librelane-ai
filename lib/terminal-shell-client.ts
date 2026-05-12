import { backendHttpBase, backendWebSocketUrl } from "./backend-ws";

export interface HostTerminalStatus {
  available: boolean;
  mode: "disabled" | "host" | "container";
  shell?: string;
  max_sessions?: number;
  open_sessions?: number;
}

export interface HostShellSession {
  session_id: string;
  project_id: string;
  cwd: string;
  created_at: string;
}

const TERMINAL_BASE = "/api/terminal";

async function asJsonOrThrow<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { detail?: string; error?: string };
  if (!res.ok) {
    const message =
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.error === "string" && data.error) ||
      `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export async function getHostTerminalStatus(): Promise<HostTerminalStatus> {
  const res = await fetch(`${TERMINAL_BASE}/status`, { cache: "no-store" });
  return asJsonOrThrow<HostTerminalStatus>(res);
}

export async function createHostShellSession(projectId: string): Promise<HostShellSession> {
  const res = await fetch(`${TERMINAL_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId }),
  });
  return asJsonOrThrow<HostShellSession>(res);
}

export async function closeHostShellSession(sessionId: string): Promise<void> {
  const res = await fetch(`${TERMINAL_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });
  await asJsonOrThrow<{ closed: boolean }>(res);
}

export function hostShellWebSocketUrl(sessionId: string): string {
  return backendWebSocketUrl(`/terminal/ws/${encodeURIComponent(sessionId)}`);
}

export function hostShellHttpBase(): string {
  return backendHttpBase();
}

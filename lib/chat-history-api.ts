import type { Message } from "./types";

function readError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const r = data as { detail?: string; error?: string; message?: string };
    if (r.detail) return r.detail;
    if (r.error) return r.error;
    if (r.message) return r.message;
  }
  return `HTTP ${status}`;
}

export async function fetchChatHistory(projectId: string): Promise<Message[]> {
  const url = `/api/ai/chat/history?project_id=${encodeURIComponent(projectId)}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { messages?: Message[] };
  if (!res.ok) {
    throw new Error(readError(data, res.status));
  }
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function putChatHistory(projectId: string, messages: Message[]): Promise<void> {
  const res = await fetch("/api/ai/chat/history", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, messages }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(readError(data, res.status));
  }
}

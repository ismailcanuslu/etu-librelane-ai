import { aiChatSocket } from "./ai-chat-client";

async function readErrorMessage(data: unknown, status: number): Promise<string> {
  if (data && typeof data === "object") {
    const record = data as { error?: string; detail?: string | Array<{ msg?: string }> };
    if (record.error) return record.error;
    if (typeof record.detail === "string") return record.detail;
    if (Array.isArray(record.detail) && record.detail[0]?.msg) return record.detail[0].msg ?? `HTTP ${status}`;
  }
  return `HTTP ${status}`;
}

async function asJsonOrThrow<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) {
    throw new Error(await readErrorMessage(data, res.status));
  }
  return data;
}

export async function analyzeLog(log: string): Promise<string> {
  const res = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ log }),
    cache: "no-store",
  });
  const data = await asJsonOrThrow<{ analysis?: string }>(res);
  return data.analysis ?? "";
}

export function startChatTransport(): void {
  aiChatSocket.start();
}

export function stopChatTransport(): void {
  aiChatSocket.stop();
}

export function onLateChatReply(
  handler: ((payload: { id: string; reply: string; replay: boolean }) => void) | null
): void {
  aiChatSocket.onLateReply(handler);
}

export async function sendChatMessage(
  message: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  return aiChatSocket.sendChatMessage(message, history);
}

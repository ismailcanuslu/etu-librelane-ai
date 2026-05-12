import { aiChatSocket } from "./ai-chat-client";

export type AiAgentPhase = "connecting" | "ready" | "failed";

export interface AiAgentStatus {
  phase: AiAgentPhase;
  message: string;
  model?: string;
}

async function readErrorMessage(data: unknown, status: number): Promise<string> {
  if (data && typeof data === "object") {
    const record = data as { error?: string; detail?: string | Array<{ msg?: string }>; message?: string };
    if (record.message) return record.message;
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

function displayModelName(model?: string): string {
  if (!model) return "Gemma";
  const lower = model.toLowerCase();
  if (lower.includes("gemma")) return "Gemma";
  return model;
}

export async function connectAiAgent(): Promise<AiAgentStatus> {
  const modelLabel = displayModelName(process.env.NEXT_PUBLIC_OLLAMA_MODEL);
  try {
    const res = await fetch("/api/ai/status", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        phase: "failed",
        message: `Ajana bağlanılamadı: ${await readErrorMessage(data, res.status)}`,
        model: modelLabel,
      };
    }

    const status = data as { ready?: boolean; message?: string; model?: string };
    const resolvedModel = displayModelName(status.model) || modelLabel;
    if (!status.ready) {
      return {
        phase: "failed",
        message: status.message ? `Ajana bağlanılamadı: ${status.message}` : "Ajana bağlanılamadı.",
        model: resolvedModel,
      };
    }

    startChatTransport();
    await aiChatSocket.waitUntilConnected();
    return {
      phase: "ready",
      message: `AI asistanı ${resolvedModel} modeline bağlı.`,
      model: resolvedModel,
    };
  } catch (error) {
    return {
      phase: "failed",
      message: `Ajana bağlanılamadı: ${error instanceof Error ? error.message : String(error)}`,
      model: modelLabel,
    };
  }
}

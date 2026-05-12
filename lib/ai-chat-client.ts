"use client";

type ChatRole = "user" | "assistant";

export type ChatHistoryItem = { role: ChatRole; content: string };

type ServerMessage =
  | { type: "connected" }
  | { type: "pong" }
  | { type: "status"; id: string; status: string; replay?: boolean }
  | { type: "reply"; id: string; reply: string; replay?: boolean }
  | { type: "error"; id?: string; message: string; replay?: boolean };

type PendingRequest = {
  resolve: (reply: string) => void;
  reject: (error: Error) => void;
};

type LateReplyHandler = (payload: { id: string; reply: string; replay: boolean }) => void;

const RECONNECT_MS = 1000;
const PING_MS = 25_000;

function chatWebSocketUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_CHAT_WS_URL?.trim();
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/ai/chat/ws`;
}

function newRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class AIChatSocketClient {
  private ws: WebSocket | null = null;
  private shouldRun = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly seenReplyIds = new Set<string>();
  private lateReplyHandler: LateReplyHandler | null = null;

  start(): void {
    this.shouldRun = true;
    this.connect();
  }

  stop(): void {
    this.shouldRun = false;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, "client stop");
      this.ws = null;
    }
  }

  onLateReply(handler: LateReplyHandler | null): void {
    this.lateReplyHandler = handler;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  waitUntilConnected(timeoutMs = 10_000): Promise<void> {
    return this.waitForOpen(timeoutMs);
  }

  sendChatMessage(message: string, history: ChatHistoryItem[]): Promise<string> {
    const id = newRequestId();
    return new Promise<string>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      void this.sendPayload({ type: "chat", id, message, history }).catch((error) => {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  private connect(): void {
    if (!this.shouldRun || typeof window === "undefined") return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = chatWebSocketUrl();
    if (!url) return;

    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.clearReconnectTimer();
      this.startPing();
    };

    ws.onmessage = (event) => {
      this.handleServerMessage(event.data);
    };

    ws.onerror = () => {
      // onclose reconnect'i tetikler
    };

    ws.onclose = () => {
      this.stopPing();
      if (this.ws === ws) this.ws = null;
      this.rejectAllPending(new Error("AI sohbet bağlantısı kapandı"));
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (!this.shouldRun || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_MS);
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      void this.sendPayload({ type: "ping" }).catch(() => {
        // kopuk bağlantı onclose ile yeniden bağlanır
      });
    }, PING_MS);
  }

  private stopPing(): void {
    if (!this.pingTimer) return;
    clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  private clearTimers(): void {
    this.clearReconnectTimer();
    this.stopPing();
  }

  private async sendPayload(payload: Record<string, unknown>): Promise<void> {
    await this.waitForOpen();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("AI sohbet bağlantısı kurulamadı.");
    }
    this.ws.send(JSON.stringify(payload));
  }

  private waitForOpen(timeoutMs = 10_000): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (!this.shouldRun) {
      return Promise.reject(new Error("AI sohbet bağlantısı kapalı."));
    }
    this.connect();
    return new Promise((resolve, reject) => {
      const ws = this.ws;
      if (!ws) {
        reject(new Error("AI sohbet bağlantısı kurulamadı."));
        return;
      }
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("AI sohbet bağlantısı zaman aşımına uğradı."));
      }, timeoutMs);
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onClose = () => {
        cleanup();
        reject(new Error("AI sohbet bağlantısı kurulamadı."));
      };
      const cleanup = () => {
        clearTimeout(timer);
        ws.removeEventListener("open", onOpen);
        ws.removeEventListener("close", onClose);
      };
      ws.addEventListener("open", onOpen);
      ws.addEventListener("close", onClose);
    });
  }

  private handleServerMessage(raw: unknown): void {
    let payload: ServerMessage;
    try {
      payload = JSON.parse(String(raw)) as ServerMessage;
    } catch {
      return;
    }

    if (payload.type === "connected" || payload.type === "pong") return;

    if (payload.type === "status") return;

    if (payload.type === "error") {
      if (payload.id) {
        this.finishRequest(payload.id, undefined, new Error(payload.message));
        if (payload.replay) this.ack(payload.id);
      }
      return;
    }

    if (payload.type === "reply") {
      const replay = Boolean(payload.replay);
      if (this.seenReplyIds.has(payload.id) && replay) {
        this.ack(payload.id);
        return;
      }
      this.seenReplyIds.add(payload.id);

      const handled = this.finishRequest(payload.id, payload.reply, undefined);
      if (!handled) {
        this.lateReplyHandler?.({ id: payload.id, reply: payload.reply, replay });
      }
      this.ack(payload.id);
    }
  }

  private finishRequest(id: string, reply: string | undefined, error: Error | undefined): boolean {
    const pending = this.pending.get(id);
    if (!pending) return false;
    this.pending.delete(id);
    if (error) pending.reject(error);
    else pending.resolve(reply ?? "");
    return true;
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private ack(id: string): void {
    void this.sendPayload({ type: "ack", id }).catch(() => {
      // ack yeniden bağlanınca tekrar gönderilebilir
    });
  }
}

export const aiChatSocket = new AIChatSocketClient();

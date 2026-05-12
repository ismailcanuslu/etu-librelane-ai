export function backendHttpBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WORKSPACE_BACKEND?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    const port = proto === "https:" ? "443" : "8001";
    return `${proto}//${host}:${port}`;
  }
  return "http://127.0.0.1:8001";
}

export function backendWebSocketUrl(path: string): string {
  const base = backendHttpBase();
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  url.pathname = normalized;
  url.search = "";
  url.hash = "";
  return url.toString();
}

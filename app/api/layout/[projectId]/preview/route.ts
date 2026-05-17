import type { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { projectId } = await ctx.params;
  const url = new URL(request.url);
  const qs = url.searchParams.toString();
  const upstream = `${BACKEND}/layout/preview/${encodeURIComponent(projectId)}${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(upstream, { cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const engine = res.headers.get("x-layout-engine");
    const headers: Record<string, string> = { "Content-Type": contentType };
    if (engine) headers["X-Layout-Engine"] = engine;

    if (!res.ok) {
      const text = await res.text();
      let message = `upstream ${res.status}`;
      try {
        const j = JSON.parse(text) as { error?: string };
        if (j.error) message = j.error;
      } catch {
        if (text) message = text.slice(0, 300);
      }
      return Response.json({ error: message }, { status: res.status });
    }

    return new Response(res.body, { status: 200, headers });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

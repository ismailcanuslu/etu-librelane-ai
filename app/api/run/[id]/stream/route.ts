// GET /api/run/:id/stream → SSE pass-through to backend /run/:id/stream
//
// Önemli: Next bu route'u cache'lemesin, response chunk'ları olduğu gibi tarayıcıya akmalı.
// Gateway tarafında /run/*/stream pattern'i streaming proxy'ye yönlendirilir (net/http).

import { getFileServiceBase } from "@/lib/file-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const base = getFileServiceBase();
  const upstream = `${base}/run/${encodeURIComponent(id)}/stream`;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: req.signal,
    });
  } catch (err) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({
        message: (err as Error).message ?? "upstream stream açılamadı",
        upstream,
      })}\n\n`,
      {
        status: 502,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }

  if (!upstreamRes.ok || !upstreamRes.body) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({
        message: `upstream HTTP ${upstreamRes.status}`,
        upstream,
      })}\n\n`,
      {
        status: upstreamRes.status,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }

  return new Response(upstreamRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

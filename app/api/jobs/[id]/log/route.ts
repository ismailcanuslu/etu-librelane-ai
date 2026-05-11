// GET /api/jobs/:id/log → backend /jobs/:id/log (text/plain stream)

import { getFileServiceBase } from "@/lib/file-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const base = getFileServiceBase();
  const upstream = `${base}/jobs/${encodeURIComponent(id)}/log`;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, { cache: "no-store", signal: req.signal });
  } catch (err) {
    return new Response(`upstream error: ${(err as Error).message}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!upstreamRes.ok || !upstreamRes.body) {
    const text = await upstreamRes.text().catch(() => "");
    return new Response(text || `upstream HTTP ${upstreamRes.status}`, {
      status: upstreamRes.status,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(upstreamRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

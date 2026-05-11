// POST /api/run/:id/cancel → backend POST /run/:id/cancel

import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const base = getFileServiceBase();
  const upstream = `${base}/run/${encodeURIComponent(id)}/cancel`;
  try {
    const res = await fetch(upstream, { method: "POST", cache: "no-store" });
    const data: unknown = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    const d = describeUpstreamFetchFailure(err, upstream);
    return Response.json(
      { error: d.message, causes: d.causes, code: d.code, hint: d.hint, upstream },
      { status: 502 }
    );
  }
}

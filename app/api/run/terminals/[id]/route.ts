// POST|DELETE /api/run/terminals/[id] → backend /run/terminals/{id}

import type { NextRequest } from "next/server";
import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const base = getFileServiceBase();
  const upstream = `${base}/run/terminals/${encodeURIComponent(id)}`;
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

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const base = getFileServiceBase();
  const upstream = `${base}/run/terminals/${encodeURIComponent(id)}`;
  try {
    const res = await fetch(upstream, { method: "DELETE", cache: "no-store" });
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

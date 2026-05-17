// POST /api/run/reset → backend POST /run/reset

import type { NextRequest } from "next/server";
import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export async function POST(request: NextRequest) {
  let body: { project_id?: string } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") {
      body = raw as { project_id?: string };
    }
  } catch {
    // bos govde: tum projeler
  }

  const base = getFileServiceBase();
  const upstream = `${base}/run/reset`;
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: body.project_id?.trim() || undefined,
      }),
      cache: "no-store",
    });
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

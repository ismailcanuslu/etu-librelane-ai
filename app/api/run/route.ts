// POST /api/run  body: { project_id, action } → backend POST /run

import type { NextRequest } from "next/server";
import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export async function POST(request: NextRequest) {
  let body: { project_id?: string; action?: string };
  try {
    body = (await request.json()) as { project_id?: string; action?: string };
  } catch {
    return Response.json({ error: "geçersiz JSON gövdesi" }, { status: 400 });
  }

  const projectId = body.project_id?.trim();
  const action = body.action?.trim();
  if (!projectId || !action) {
    return Response.json({ error: "project_id ve action zorunlu" }, { status: 400 });
  }

  const base = getFileServiceBase();
  const upstream = `${base}/run`;
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId, action }),
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

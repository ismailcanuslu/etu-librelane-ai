// GET /api/jobs?project_id=...&limit=...&offset=... → backend /jobs

import type { NextRequest } from "next/server";
import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const search = new URLSearchParams();
  const projectId = params.get("project_id");
  if (projectId) search.set("project_id", projectId);
  const limit = params.get("limit");
  if (limit) search.set("limit", limit);
  const offset = params.get("offset");
  if (offset) search.set("offset", offset);

  const base = getFileServiceBase();
  const upstream = `${base}/jobs/${search.size ? `?${search.toString()}` : ""}`;
  try {
    const res = await fetch(upstream, { cache: "no-store" });
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

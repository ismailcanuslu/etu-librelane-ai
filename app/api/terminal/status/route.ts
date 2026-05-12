// GET /api/terminal/status → backend GET /terminal/status

import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = getFileServiceBase();
  const upstream = `${base}/terminal/status`;
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

import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export async function POST(request: Request) {
  const base = getFileServiceBase();
  const upstream = `${base}/ai/analyze`;
  try {
    const body = await request.json();
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

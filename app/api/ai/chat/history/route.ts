import { getFileServiceBase } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

export async function GET(request: Request) {
  const base = getFileServiceBase();
  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id")?.trim() ?? "";
  if (!projectId) {
    return Response.json({ error: "project_id gerekli" }, { status: 400 });
  }
  const upstream = `${base}/ai/chat/history?project_id=${encodeURIComponent(projectId)}`;
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

export async function PUT(request: Request) {
  const base = getFileServiceBase();
  const upstream = `${base}/ai/chat/history`;
  try {
    const body = await request.json();
    const res = await fetch(upstream, {
      method: "PUT",
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

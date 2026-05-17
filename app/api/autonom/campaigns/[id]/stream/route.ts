import { getFileServiceBase } from "@/lib/file-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const base = getFileServiceBase();
  const lastEventId = request.headers.get("last-event-id");
  const headers: HeadersInit = { Accept: "text/event-stream" };
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;

  const upstream = `${base}/autonom/campaigns/${encodeURIComponent(id)}/stream`;
  const res = await fetch(upstream, { headers, cache: "no-store" });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

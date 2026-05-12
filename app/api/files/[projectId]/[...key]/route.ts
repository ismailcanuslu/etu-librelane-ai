// GET    /api/files/[projectId]/[...key]  — download / stream object
// DELETE /api/files/[projectId]/[...key]  — delete object

import type { NextRequest } from "next/server";
import { upstreamObjectsPath } from "@/lib/file-service";

type Ctx = { params: Promise<{ projectId: string; key: string[] }> };

function upstreamUrl(projectId: string, key: string[]) {
  return upstreamObjectsPath(projectId, key.join("/"));
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { projectId, key } = await ctx.params;

  try {
    const res = await fetch(upstreamUrl(projectId, key), { cache: "no-store" });

    if (!res.ok) {
      const errText = await res.text();
      let message = `upstream ${res.status}`;
      try {
        const j = JSON.parse(errText) as { error?: string };
        if (j.error) message = j.error;
      } catch {
        if (errText) message = errText.slice(0, 200);
      }
      return Response.json({ error: message }, { status: res.status });
    }

    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = res.headers.get("content-length");
    const etag = res.headers.get("etag");

    const headers: Record<string, string> = { "Content-Type": contentType };
    if (contentLength) headers["Content-Length"] = contentLength;
    if (etag) headers["ETag"] = etag;

    return new Response(res.body, { status: 200, headers });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { projectId, key } = await ctx.params;

  try {
    const res = await fetch(upstreamUrl(projectId, key), {
      method: "DELETE",
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || "upstream error" };
    }
    return Response.json(data as object, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

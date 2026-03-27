// POST /api/files/[bucket]/upload?key=<objectKey>  — upload file to bucket

import type { NextRequest } from "next/server";
import { FILE_SERVICE_BASE, encodeObjectKeyPath } from "@/lib/file-service";

type Ctx = { params: Promise<{ bucket: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const { bucket } = await ctx.params;
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return Response.json({ error: "key query param is required" }, { status: 400 });
  }

  const contentType =
    request.headers.get("x-content-type") ??
    request.headers.get("content-type") ??
    "application/octet-stream";

  const upstream = `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(bucket)}/objects/${encodeObjectKeyPath(key)}`;

  try {
    const body = await request.arrayBuffer();
    const res = await fetch(upstream, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
    const text = await res.text();
    let data: unknown = { raw: text };
    try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
    return Response.json(data as object, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

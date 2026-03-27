// GET /api/files/[bucket]/meta/[...key]  — object metadata

import type { NextRequest } from "next/server";
import { FILE_SERVICE_BASE, encodeObjectKeyPath } from "@/lib/file-service";

type Ctx = { params: Promise<{ bucket: string; key: string[] }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { bucket, key } = await ctx.params;
  const upstream = `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(bucket)}/meta/${encodeObjectKeyPath(key.join("/"))}`;

  try {
    const res = await fetch(upstream, { cache: "no-store" });
    const text = await res.text();
    let data: unknown = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || "invalid upstream response" }; }
    return Response.json(data as object, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

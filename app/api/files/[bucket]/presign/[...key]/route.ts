// POST /api/files/[bucket]/presign/[...key]?expiryMinutes=15

import type { NextRequest } from "next/server";
import { FILE_SERVICE_BASE, encodeObjectKeyPath } from "@/lib/file-service";

type Ctx = { params: Promise<{ bucket: string; key: string[] }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const { bucket, key } = await ctx.params;
  const expiryMinutes = request.nextUrl.searchParams.get("expiryMinutes") ?? "15";

  const upstream = new URL(
    `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(bucket)}/presign/${encodeObjectKeyPath(key.join("/"))}`
  );
  upstream.searchParams.set("expiryMinutes", expiryMinutes);

  try {
    const res = await fetch(upstream.toString(), { method: "POST", cache: "no-store" });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

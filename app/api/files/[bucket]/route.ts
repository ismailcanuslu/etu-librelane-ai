// GET /api/files/[bucket]?prefix=&recursive=  → list objects in project

import type { NextRequest } from "next/server";
import { getFileServiceBase } from "@/lib/file-service";

type Ctx = { params: Promise<{ bucket: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { bucket } = await ctx.params;
  const { searchParams } = request.nextUrl;
  const prefix = searchParams.get("prefix") ?? "";
  const recursive = searchParams.get("recursive") ?? "true";

  const upstream = new URL(
    `${getFileServiceBase()}/workspace/projects/${encodeURIComponent(bucket)}/objects`
  );
  upstream.searchParams.set("prefix", prefix);
  upstream.searchParams.set("recursive", recursive);

  try {
    const res = await fetch(upstream.toString(), { cache: "no-store" });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

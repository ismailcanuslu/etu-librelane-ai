// GET /api/files/[projectId]/meta/[...key]  — object metadata

import type { NextRequest } from "next/server";
import { upstreamObjectsMetaPath } from "@/lib/file-service";

type Ctx = { params: Promise<{ projectId: string; key: string[] }> };

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { projectId, key } = await ctx.params;
  const upstream = upstreamObjectsMetaPath(projectId, key.join("/"));

  try {
    const res = await fetch(upstream, { cache: "no-store" });
    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text || "invalid upstream response" };
    }
    return Response.json(data as object, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

// GET    /api/files/[projectId]?prefix=&recursive=  → list objects in project
// DELETE /api/files/[projectId]                    → delete project and all files

import type { NextRequest } from "next/server";
import { upstreamProjectObjectsPath, upstreamProjectPath } from "@/lib/file-service";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { projectId } = await ctx.params;
  const { searchParams } = request.nextUrl;
  const prefix = searchParams.get("prefix") ?? "";
  const recursive = searchParams.get("recursive") ?? "true";

  const upstream = new URL(upstreamProjectObjectsPath(projectId));
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

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { projectId } = await ctx.params;

  try {
    const res = await fetch(upstreamProjectPath(projectId), {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

// DELETE /api/buckets/[name] → delete bucket and all its objects

import type { NextRequest } from "next/server";
import { FILE_SERVICE_BASE } from "@/lib/file-service";

type Ctx = { params: Promise<{ name: string }> };

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { name } = await ctx.params;

  try {
    const res = await fetch(
      `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(name)}`,
      { method: "DELETE", cache: "no-store" }
    );
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

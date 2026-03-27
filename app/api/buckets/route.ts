// GET  /api/buckets       → list all buckets
// POST /api/buckets       → create bucket (body: { name: string })

import type { NextRequest } from "next/server";
import { FILE_SERVICE_BASE } from "@/lib/file-service";

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function GET() {
  try {
    const res = await fetch(`${FILE_SERVICE_BASE}/buckets`, { cache: "no-store" });
    const data = await safeJson(res);
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  // Accept both application/json and plain text bodies
  let name: string | undefined;
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = await request.json() as { name?: string };
      name = body.name?.trim();
    } else {
      // Fallback: read raw text, try JSON parse, else treat as plain bucket name
      const text = (await request.text()).trim();
      try {
        const parsed = JSON.parse(text) as { name?: string };
        name = parsed.name?.trim();
      } catch {
        name = text || undefined;
      }
    }
  } catch {
    return Response.json({ error: "Could not parse request body" }, { status: 400 });
  }

  if (!name) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(name)}`, {
      method: "POST",
    });
    const data = await safeJson(res);
    return Response.json(data, { status: res.status });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }
}

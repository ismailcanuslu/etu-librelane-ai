// GET  /api/files       → list workspace projects
// POST /api/files       → create project (body: { name: string })

import type { NextRequest } from "next/server";
import { upstreamProjectPath, upstreamProjectsPath } from "@/lib/file-service";
import { describeUpstreamFetchFailure } from "@/lib/upstream-fetch-error";

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function GET() {
  const upstream = upstreamProjectsPath();
  try {
    const res = await fetch(upstream, { cache: "no-store" });
    const data = (await safeJson(res)) as {
      projects?: Array<{ name: string; createdAt: string }>;
      count?: number;
    };
    const projects = data.projects ?? [];
    return Response.json(
      {
        count: data.count ?? projects.length,
        projects,
      },
      { status: res.status }
    );
  } catch (err) {
    const d = describeUpstreamFetchFailure(err, upstream);
    return Response.json(
      {
        error: d.message,
        causes: d.causes,
        code: d.code,
        upstream,
        hint: d.hint,
      },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  let name: string | undefined;
  let template: string | undefined;
  try {
    const ct = request.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = (await request.json()) as { name?: string; template?: string };
      name = body.name?.trim();
      template = body.template?.trim();
    } else {
      const text = (await request.text()).trim();
      try {
        const parsed = JSON.parse(text) as { name?: string; template?: string };
        name = parsed.name?.trim();
        template = parsed.template?.trim();
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

  const normalizedTemplate = template === "verilog" ? "verilog" : "caravel";
  const upstream = `${upstreamProjectPath(name)}?template=${normalizedTemplate}`;
  try {
    const res = await fetch(upstream, { method: "POST" });
    const data = await safeJson(res);
    return Response.json(data, { status: res.status });
  } catch (err) {
    const d = describeUpstreamFetchFailure(err, upstream);
    return Response.json(
      {
        error: d.message,
        causes: d.causes,
        code: d.code,
        upstream,
        hint: d.hint,
      },
      { status: 502 }
    );
  }
}

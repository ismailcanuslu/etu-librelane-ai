import { getFileServiceBase } from "@/lib/file-service";

/**
 * Upstream `GET /health`. Gateway tabanı verilmişse gateway health'ine gider.
 */
export async function GET() {
  try {
    const res = await fetch(`${getFileServiceBase()}/health`, { cache: "no-store" });
    const text = await res.text();
    let data: unknown = { status: "unknown" };
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    return Response.json(data as object, { status: res.status });
  } catch (err) {
    return Response.json(
      { error: String(err), hint: "WORKSPACE_BACKEND ve gateway/backend servisinin ayakta olduğundan emin olun" },
      { status: 502 }
    );
  }
}

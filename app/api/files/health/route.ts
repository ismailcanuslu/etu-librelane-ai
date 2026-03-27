import { FILE_SERVICE_BASE } from "@/lib/file-service";

/** Proxies Go service `GET /health` (MinIO erişilebilirliği sunucu tarafında doğrulanır). */
export async function GET() {
  try {
    const res = await fetch(`${FILE_SERVICE_BASE}/health`, { cache: "no-store" });
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
      { error: String(err), hint: "MINIO_BACKEND ve Go servisinin ayakta olduğundan emin olun" },
      { status: 502 }
    );
  }
}

/** Backend layout önizleme — GDS bytes veya KLayout PNG */

const LAYOUT_BASE = "/api/layout";

/** Sunucu KLayout render varsayılanı (1440p) */
export const KLAYOUT_PREVIEW_WIDTH = 2560;
export const KLAYOUT_PREVIEW_HEIGHT = 1440;

/** OpenLane Flow job sonrası otomatik üretilen PNG */
export const FLOW_LAYOUT_PNG_NAME = "layout_klayout_1440p.png";

export type LayoutEngine = "browser" | "klayout";

export interface LayoutCapabilities {
  engines: Array<{
    id: LayoutEngine;
    label: string;
    description: string;
    available?: boolean;
  }>;
}

export async function fetchLayoutCapabilities(): Promise<LayoutCapabilities> {
  const res = await fetch(`${LAYOUT_BASE}/capabilities`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Önizleme yetenekleri alınamadı (${res.status})`);
  }
  return res.json() as Promise<LayoutCapabilities>;
}

export function layoutPreviewUrl(
  projectId: string,
  key: string,
  engine: LayoutEngine,
  size?: { width?: number; height?: number }
): string {
  const params = new URLSearchParams({ key, engine });
  const width = size?.width ?? (engine === "klayout" ? KLAYOUT_PREVIEW_WIDTH : undefined);
  const height = size?.height ?? (engine === "klayout" ? KLAYOUT_PREVIEW_HEIGHT : undefined);
  if (width) params.set("width", String(width));
  if (height) params.set("height", String(height));
  return `${LAYOUT_BASE}/${encodeURIComponent(projectId)}/preview?${params}`;
}

export async function fetchLayoutPreviewBlob(
  projectId: string,
  key: string,
  engine: LayoutEngine
): Promise<Blob> {
  const res = await fetch(layoutPreviewUrl(projectId, key, engine), { cache: "no-store" });
  if (!res.ok) {
    let message = `Önizleme başarısız (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.blob();
}

/**
 * Atölye (otonom kampanya) istemcisi — /api/autonom
 */

import type { AutonomCampaignPreview, AutonomCampaignSpec, AutonomCampaignStatus } from "./types";

const BASE = "/api/autonom";

function readError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const r = data as { error?: string; detail?: string };
    if (r.error) return r.error;
    if (typeof r.detail === "string") return r.detail;
  }
  return `HTTP ${status}`;
}

async function asJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) throw new Error(readError(data, res.status));
  return data;
}

export async function previewAutonomCampaign(body: {
  project_id: string;
  config_key: string;
  spec: AutonomCampaignSpec;
}): Promise<AutonomCampaignPreview> {
  const res = await fetch(`${BASE}/campaigns/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return asJson(res);
}

export async function startAutonomCampaign(body: {
  project_id: string;
  config_key: string;
  spec: AutonomCampaignSpec;
}): Promise<{ campaign_id: string; status: string }> {
  const res = await fetch(`${BASE}/campaigns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return asJson(res);
}

export async function getAutonomCampaign(campaignId: string) {
  const res = await fetch(`${BASE}/campaigns/${encodeURIComponent(campaignId)}`, {
    cache: "no-store",
  });
  return asJson<{
    campaign: {
      id: string;
      status: AutonomCampaignStatus;
      stop_reason: string | null;
      current_iteration: number;
    };
    iterations: Array<{
      index: number;
      param_label: string;
      status: string;
      error_summary: string | null;
    }>;
  }>(res);
}

export async function cancelAutonomCampaign(campaignId: string) {
  const res = await fetch(`${BASE}/campaigns/${encodeURIComponent(campaignId)}/cancel`, {
    method: "POST",
  });
  return asJson<{ cancelled: boolean }>(res);
}

export interface AutonomCampaignSubscribers {
  onEvent?: (type: string, data: Record<string, unknown>) => void;
  onClosed?: () => void;
}

export function subscribeAutonomCampaign(
  campaignId: string,
  handlers: AutonomCampaignSubscribers
): { close: () => void } {
  const es = new EventSource(`${BASE}/campaigns/${encodeURIComponent(campaignId)}/stream`);

  const types = ["status", "iteration_started", "iteration_done", "job_started", "done", "error"];
  for (const type of types) {
    es.addEventListener(type, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as Record<string, unknown>;
        handlers.onEvent?.(type, data);
      } catch {
        /* ignore */
      }
    });
  }

  es.addEventListener("error", () => {
    if (es.readyState === EventSource.CLOSED) handlers.onClosed?.();
  });

  return {
    close() {
      es.close();
      handlers.onClosed?.();
    },
  };
}

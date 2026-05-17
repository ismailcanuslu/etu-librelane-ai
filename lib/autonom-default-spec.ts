import {
  configFormatFromKey,
  parseConfigContent,
} from "@/lib/openlane-config-io";
import type { AutonomCampaignSpec, AutonomParamKind } from "@/lib/types";

/** Config içeriğinden varsayılan atölye spec üretir. */
export function buildDefaultAutonomSpec(
  configContent: string,
  configKey: string
): AutonomCampaignSpec {
  const fmt = configFormatFromKey(configKey);
  const parsed = parseConfigContent(configContent, fmt);

  let flag = "FP_CORE_UTIL";
  let kind: AutonomParamKind = "scalar";
  let start: number | number[] = 120;
  let target: number | number[] = 90;
  let step: number | number[] = -5;

  if (parsed.ok) {
    const data = parsed.data;
    if (data.DIE_AREA != null) {
      flag = "DIE_AREA";
      const raw = String(data.DIE_AREA).trim();
      const parts = raw.split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        kind = "die_area_rect";
        start = parts;
        target = [parts[0], parts[1], Math.max(90, parts[2] - 60), Math.max(90, parts[3] - 60)];
        step = [0, 0, -5, -5];
      }
    } else if (typeof data.FP_CORE_UTIL === "number") {
      flag = "FP_CORE_UTIL";
      start = data.FP_CORE_UTIL;
      target = Math.max(10, start - 30);
      step = -5;
    } else {
      const firstNum = Object.entries(data).find(
        ([, v]) => typeof v === "number" && Number.isFinite(v)
      );
      if (firstNum) {
        flag = firstNum[0];
        start = firstNum[1] as number;
        target = typeof start === "number" ? Math.max(0, start - 20) : 90;
        step = typeof start === "number" && start > 50 ? -5 : -1;
      }
    }
  }

  return {
    param: {
      flag,
      kind,
      start,
      target,
      step,
      serialize_as: undefined,
    },
    build_actions: ["synthesis"],
    input_files: [],
  };
}

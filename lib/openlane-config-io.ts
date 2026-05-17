import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export type ConfigFormat = "json" | "yaml" | "yml";

export type ConfigEntry = { key: string; value: unknown };

export function configFormatFromKey(key: string): ConfigFormat {
  const base = key.split("/").pop()?.toLowerCase() ?? "";
  if (base === "config.yaml") return "yaml";
  if (base === "config.yml") return "yml";
  return "json";
}

export function isOpenlaneConfigFile(nameOrKey: string): boolean {
  const base = nameOrKey.split("/").pop()?.toLowerCase() ?? "";
  return base === "config.json" || base === "config.yaml" || base === "config.yml";
}

export function parseConfigContent(
  text: string,
  format: ConfigFormat
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  try {
    if (format === "json") {
      const parsed = JSON.parse(text || "{}");
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "Kök nesne bir JSON objesi olmalı." };
      }
      return { ok: true, data: parsed as Record<string, unknown> };
    }
    const parsed = parseYaml(text || "{}");
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Kök nesne bir YAML objesi olmalı." };
    }
    return { ok: true, data: parsed as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function serializeConfigContent(data: Record<string, unknown>, format: ConfigFormat): string {
  if (format === "json") {
    return `${JSON.stringify(data, null, 2)}\n`;
  }
  return stringifyYaml(data, { lineWidth: 0 });
}

export function configToEntries(data: Record<string, unknown>): ConfigEntry[] {
  return Object.entries(data).map(([key, value]) => ({ key, value }));
}

export function entriesToConfig(entries: ConfigEntry[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, value } of entries) {
    if (!key.trim()) continue;
    out[key.trim()] = value;
  }
  return out;
}

export function valueToEditString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function parseEditString(raw: string): unknown {
  const t = raw.trim();
  if (t === "") return "";
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      return JSON.parse(t);
    } catch {
      return t;
    }
  }
  return t;
}

/** OpenLane zorunlu + CLOCK_* eksiklik kontrolü */
export const OPENLANE_REQUIRED_KEYS = [
  "DESIGN_NAME",
  "VERILOG_FILES",
  "CLOCK_PERIOD",
  "CLOCK_NET",
  "CLOCK_PORT",
] as const;

export const SCAFFOLD_RECOMMENDED_KEYS = [
  "DESIGN_NAME",
  "VERILOG_FILES",
  "CLOCK_PORT",
  "CLOCK_PERIOD",
  "FP_CORE_UTIL",
  "PL_TARGET_DENSITY",
  "DESIGN_IS_CORE",
] as const;

export function getMissingRequiredKeys(data: Record<string, unknown>): string[] {
  const keys = new Set(Object.keys(data));
  const missing: string[] = [];
  for (const req of OPENLANE_REQUIRED_KEYS) {
    if (!keys.has(req)) missing.push(req);
  }
  const hasClock = [...keys].some((k) => k.startsWith("CLOCK_"));
  if (!hasClock) {
    missing.push("CLOCK_* (en az bir CLOCK_ bayrağı)");
  }
  return missing;
}

export function getMissingScaffoldKeys(data: Record<string, unknown>): string[] {
  const keys = new Set(Object.keys(data));
  return SCAFFOLD_RECOMMENDED_KEYS.filter((k) => !keys.has(k));
}

"use client";

import { AlertTriangle } from "lucide-react";
import type { OpenlaneConfigCatalog } from "@/lib/openlane-config-catalog-client";
import {
  getMissingRequiredKeys,
  getMissingScaffoldKeys,
  type ConfigEntry,
} from "@/lib/openlane-config-io";

interface ConfigRequiredFlagsBannerProps {
  entries: ConfigEntry[];
  catalog: OpenlaneConfigCatalog | null;
  onAddKey?: (key: string, suggestedValue?: string) => void;
}

const SCAFFOLD_DEFAULTS: Record<string, string> = {
  DESIGN_NAME: "top",
  VERILOG_FILES: "dir::src",
  CLOCK_PORT: "clk",
  CLOCK_PERIOD: "10",
  FP_CORE_UTIL: "35",
  PL_TARGET_DENSITY: "0.35",
  DESIGN_IS_CORE: "true",
};

export default function ConfigRequiredFlagsBanner({
  entries,
  catalog,
  onAddKey,
}: ConfigRequiredFlagsBannerProps) {
  const data = Object.fromEntries(entries.map((e) => [e.key, e.value]));
  const missingRequired = getMissingRequiredKeys(data);
  const missingScaffold = getMissingScaffoldKeys(data);

  if (missingRequired.length === 0 && missingScaffold.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1 space-y-2 text-[11px]">
          {missingRequired.length > 0 && (
            <div>
              <p className="font-medium text-amber-200">Zorunlu OpenLane bayrakları eksik</p>
              <ul className="mt-1 list-inside list-disc text-amber-100/90">
                {missingRequired.map((k) => (
                  <li key={k} className="flex flex-wrap items-center gap-2">
                    <code className="font-mono text-[10px]">{k}</code>
                    {onAddKey && !k.includes("*") && (
                      <button
                        type="button"
                        onClick={() => onAddKey(k, SCAFFOLD_DEFAULTS[k])}
                        className="rounded bg-amber-600/30 px-1.5 py-0.5 text-[10px] text-amber-100 hover:bg-amber-600/50"
                      >
                        Ekle
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {missingScaffold.length > 0 && (
            <div>
              <p className="font-medium text-amber-200/80">İskelet önerileri (scaffold)</p>
              <p className="mt-0.5 text-[10px] text-amber-200/60">
                Yeni projelerde varsayılan olarak bulunur; eksikse akış sorunları yaşanabilir.
              </p>
              <ul className="mt-1 flex flex-wrap gap-1">
                {missingScaffold.map((k) => (
                  <li key={k}>
                    {onAddKey ? (
                      <button
                        type="button"
                        onClick={() => onAddKey(k, SCAFFOLD_DEFAULTS[k])}
                        className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-100 hover:bg-amber-500/20"
                      >
                        + {k}
                      </button>
                    ) : (
                      <code className="font-mono text-[10px] text-amber-100/80">{k}</code>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {catalog?.source_url && (
            <p className="text-[9px] text-slate-500">
              Katalog: {catalog.version ?? "openlane"} · {catalog.variables ? Object.keys(catalog.variables).length : 0} bayrak
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

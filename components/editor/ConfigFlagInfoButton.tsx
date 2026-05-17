"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import type { OpenlaneConfigVariableMeta } from "@/lib/openlane-config-catalog-client";

export default function ConfigFlagInfoButton({ meta }: { meta: OpenlaneConfigVariableMeta | undefined }) {
  const button = (
    <button
      type="button"
      className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-slate-500 hover:bg-white/10 hover:text-violet-300"
      aria-label="Bayrak açıklaması"
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );

  if (!meta) {
    return (
      <span className="flex h-6 w-6 items-center justify-center text-slate-600" title="Katalogda yok">
        {button}
      </span>
    );
  }

  return (
    <Tooltip
      side="left"
      content={
        <div className="text-left">
          <p className="text-[11px] leading-relaxed">{meta.description_tr}</p>
          {meta.default ? (
            <p className="mt-1 text-[10px] text-slate-400">Varsayılan: {meta.default}</p>
          ) : null}
          <p className="mt-1 text-[10px] text-slate-500 capitalize">{meta.value_kind}</p>
        </div>
      }
    >
      {button}
    </Tooltip>
  );
}

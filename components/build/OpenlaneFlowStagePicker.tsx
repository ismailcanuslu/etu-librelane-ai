"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FlowStageOption {
  id: string;
  label: string;
  description?: string;
}

interface OpenlaneFlowStagePickerProps {
  stages: FlowStageOption[];
  defaultIds: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** placement'e kadar (lint → placement) */
  placementPresetIds?: string[];
}

export default function OpenlaneFlowStagePicker({
  stages,
  defaultIds,
  selected,
  onChange,
  disabled,
  placementPresetIds,
}: OpenlaneFlowStagePickerProps) {
  const allSelected =
    defaultIds.length > 0 && defaultIds.every((id) => selected.includes(id));
  const hasGds = selected.some((id) => id === "gds_magic" || id === "gds_klayout");

  const orderedSelected = useMemo(
    () => defaultIds.filter((id) => selected.includes(id)),
    [defaultIds, selected]
  );

  function toggle(id: string) {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function selectAll() {
    if (disabled) return;
    onChange([...defaultIds]);
  }

  function selectThroughPlacement() {
    if (disabled || !placementPresetIds?.length) return;
    const preset = defaultIds.filter((id) => placementPresetIds.includes(id));
    onChange(preset.length ? preset : [...defaultIds]);
  }

  const presetInOrder = useMemo(
    () => defaultIds.filter((id) => placementPresetIds?.includes(id)),
    [defaultIds, placementPresetIds]
  );
  const throughPlacement =
    presetInOrder.length > 0 &&
    orderedSelected.length === presetInOrder.length &&
    presetInOrder.every((id) => selected.includes(id));

  return (
    <section className="space-y-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
      <div>
        <p className="text-xs font-semibold text-amber-100">OpenLane aşamaları</p>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Tam GDS çıktısı için genelde tüm aşamalar gerekir. Logda yaklaşık 80 alt adım
          görünebilir; seçtiğiniz listede yalnızca bu makro aşamalar çalışır.
        </p>
      </div>

      <div className="flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/90" />
        <p className="text-[10px] leading-relaxed text-amber-100/90">
          GDS çıktısı almak için tüm aşamaları (yaklaşık 80 farklı alt adım) tamamlamak gerekir;
          bu işlem saatlerce sürebilir. Cihazınız uyku moduna geçerse veya bu sekmeyi
          kapatırsanız işlem yarıda kalabilir.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={selectAll}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors",
            allSelected
              ? "border-brand/40 bg-brand/20 text-brand"
              : "border-white/10 bg-white/5 text-slate-300 hover:border-brand/30"
          )}
        >
          Tümü
        </button>
        {placementPresetIds && placementPresetIds.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={selectThroughPlacement}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[10px] font-medium transition-colors",
              throughPlacement
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-emerald-500/30"
            )}
          >
            Placement&apos;e kadar
          </button>
        ) : null}
        <span className="text-[10px] text-slate-500">
          {orderedSelected.length}/{defaultIds.length} seçili
          {orderedSelected.length > 0 && !allSelected
            ? ` · ${orderedSelected[0]} → ${orderedSelected[orderedSelected.length - 1]}`
            : null}
        </span>
      </div>

      <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-[#0d1117]/50 p-2">
        {stages.map((stage) => {
          const checked = selected.includes(stage.id);
          return (
            <label
              key={stage.id}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                checked ? "bg-brand/10 text-slate-100" : "text-slate-400 hover:bg-white/5",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(stage.id)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-white/20 bg-surface-2 text-brand focus:ring-brand/40"
              />
              <span className="min-w-0">
                <span className="font-medium">{stage.label}</span>
                {stage.description ? (
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    {stage.description}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {!allSelected && !hasGds ? (
        <p className="text-[10px] text-amber-300/90">
          GDS üretimi için en az bir GDS aşaması (Magic veya KLayout) seçmeniz önerilir.
        </p>
      ) : null}
    </section>
  );
}

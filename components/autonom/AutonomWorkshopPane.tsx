"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FlaskConical,
  Info,
  Loader2,
  Play,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILD_FLOW_ORDER } from "@/lib/build-flow";
import {
  previewAutonomCampaign,
  startAutonomCampaign,
  subscribeAutonomCampaign,
  cancelAutonomCampaign,
} from "@/lib/autonom-client";
import { fetchRunPreview } from "@/lib/job-client";
import type {
  AutonomCampaignSpec,
  AutonomParamKind,
  AutonomWorkshopTabState,
} from "@/lib/types";
import OpenlaneFlowStagePicker from "@/components/build/OpenlaneFlowStagePicker";
import InputFileTreeView from "@/components/build/InputFileTreeView";
import ConfigFlagAutocomplete from "@/components/editor/ConfigFlagAutocomplete";
import {
  fetchOpenlaneConfigCatalog,
  searchCatalogFlags,
  type OpenlaneConfigCatalog,
} from "@/lib/openlane-config-catalog-client";
import { getAutonomCampaign } from "@/lib/autonom-client";

const BUILD_LABELS: Record<string, string> = {
  lint: "Lint",
  synthesis: "Sentez",
  verification: "Doğrulama",
  simulation: "Simülasyon",
  "openlane1-flow": "OpenLane1 Flow",
};

interface AutonomWorkshopPaneProps {
  workshop: AutonomWorkshopTabState;
  onChange?: (patch: Partial<AutonomWorkshopTabState>) => void;
}

function num(v: string): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function AutonomWorkshopPane({ workshop, onChange }: AutonomWorkshopPaneProps) {
  const { projectId, configKey, step, spec, campaignId, preview } = workshop;
  const [specState, setSpecState] = useState<AutonomCampaignSpec>(spec);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [flowStages, setFlowStages] = useState<
    Array<{ id: string; label: string; description?: string }>
  >([]);
  const [flowDefaultIds, setFlowDefaultIds] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<OpenlaneConfigCatalog | null>(null);
  const [flagQuery, setFlagQuery] = useState(spec.param.flag);

  const locked = Boolean(campaignId);
  const hasOpenlane = specState.build_actions.includes("openlane1-flow");

  const patchSpec = useCallback(
    (next: AutonomCampaignSpec) => {
      setSpecState(next);
      onChange?.({ spec: next });
    },
    [onChange]
  );

  useEffect(() => {
    void fetchOpenlaneConfigCatalog().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    void getAutonomCampaign(campaignId).catch(() => {});
    const sub = subscribeAutonomCampaign(campaignId, {
      onEvent: (type, data) => {
        if (type === "iteration_started") {
          setLogLines((prev) => [...prev, `Iter ${data.index}: ${data.param_label}`]);
        }
        if (type === "iteration_done") {
          setLogLines((prev) => [
            ...prev,
            `Iter ${data.index} bitti: ${data.status}${data.reason ? ` — ${data.reason}` : ""}`,
          ]);
        }
        if (type === "done") {
          setLogLines((prev) => [
            ...prev,
            `Kampanya: ${data.status} — ${String(data.stop_reason ?? "")}`,
          ]);
        }
      },
    });
    return () => sub.close();
  }, [campaignId]);

  const flagSuggestions = useMemo(() => {
    if (!catalog || flagQuery.length < 2) return [];
    return searchCatalogFlags(catalog, flagQuery, null).slice(0, 12);
  }, [catalog, flagQuery]);

  useEffect(() => {
    void fetchRunPreview(projectId, "openlane1-flow")
      .then((p) => {
        setFlowStages(p.flow_stages ?? []);
        setFlowDefaultIds(p.default_flow_steps ?? []);
        if (!spec.input_files?.length) {
          const files = p.default_input_files ?? p.input_files ?? [];
          patchSpec({ ...specState, input_files: files });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const iterationHint = useMemo(() => {
    if (specState.param.kind === "scalar") {
      const s = num(String(specState.param.start));
      const t = num(String(specState.param.target));
      const st = num(String(specState.param.step));
      if (st === 0) return "Adım 0 — tek iterasyon";
      const count = Math.abs(Math.round((t - s) / st)) + 1;
      return `Yaklaşık ${count} iterasyon (${s} → ${t}, adım ${st})`;
    }
    return "Boyut çifti veya DIE_AREA için hedefe kadar adımlar üretilir";
  }, [specState.param]);

  async function goToStep2() {
    setError(null);
    setLoading(true);
    try {
      const p = await previewAutonomCampaign({
        project_id: projectId,
        config_key: configKey,
        spec: specState,
      });
      onChange?.({ step: 2, preview: p, spec: specState });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function startCampaign() {
    setError(null);
    setLoading(true);
    try {
      const res = await startAutonomCampaign({
        project_id: projectId,
        config_key: configKey,
        spec: specState,
      });
      onChange?.({ campaignId: res.campaign_id });
      setLogLines([`Kampanya başladı: ${res.campaign_id}`]);
      subscribeAutonomCampaign(res.campaign_id, {
        onEvent: (type, data) => {
          if (type === "iteration_started") {
            setLogLines((prev) => [
              ...prev,
              `Iter ${data.index}: ${data.param_label}`,
            ]);
          }
          if (type === "iteration_done") {
            setLogLines((prev) => [
              ...prev,
              `Iter ${data.index} bitti: ${data.status}${data.reason ? ` — ${data.reason}` : ""}`,
            ]);
          }
          if (type === "done") {
            setLogLines((prev) => [
              ...prev,
              `Kampanya: ${data.status} — ${data.stop_reason ?? ""}`,
            ]);
          }
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function renderScalarFields(
    label: string,
    values: { start: string; target: string; step: string },
    onChangeFields: (v: { start: string; target: string; step: string }) => void
  ) {
    return (
      <div>
        <p className="mb-1 text-[10px] font-medium text-slate-500">{label}</p>
        <div>
          {(["start", "target", "step"] as const).map((k) => (
            <label key={k} className="block text-[10px] text-slate-500">
              {k === "start" ? "Başlangıç" : k === "target" ? "Hedef" : "Adım"}
              <input
                type="number"
                disabled={locked}
                value={values[k]}
                onChange={(e) =>
                  onChangeFields({ ...values, [k]: e.target.value })
                }
                className="mt-0.5 w-full rounded border border-white/10 bg-[#0d1117] px-2 py-1 font-mono text-[11px] text-slate-200"
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex flex-shrink-0 flex-col gap-2 border-b border-white/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-slate-100">Config Atölye</p>
            <p className="font-mono text-[10px] text-slate-500">{configKey}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("rounded px-2 py-0.5 text-[10px]", step === 1 ? "bg-violet-600 text-white" : "bg-white/10 text-slate-500")}>
            1. Parametre
          </span>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <span className={cn("rounded px-2 py-0.5 text-[10px]", step === 2 ? "bg-violet-600 text-white" : "bg-white/10 text-slate-500")}>
            2. Onay
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/90" />
          <p className="text-[10px] leading-relaxed text-amber-100/90">
            Config otomatik güncellenir ve seçtiğiniz araçlar sırayla çalışır. Sonuçlar{" "}
            <span className="font-mono">_autonom_jobs</span> altında saklanır. Hedefe ulaşınca
            veya hata alınca durur. Uzun sürebilir; sekme kapansa bile sunucuda devam eder.
          </p>
        </div>

        {step === 1 && (
          <>
            <section className="space-y-2 rounded-lg border border-white/10 p-3">
              <p className="text-[11px] font-semibold text-slate-300">Config parametresi</p>
              <label className="block text-[10px] text-slate-500">
                Bayrak adı
                <div className="mt-0.5">
                  <ConfigFlagAutocomplete
                    value={flagQuery}
                    onChange={setFlagQuery}
                    suggestions={flagSuggestions}
                    catalog={catalog}
                    onSelect={(key) => {
                      setFlagQuery(key);
                      patchSpec({
                        ...specState,
                        param: { ...specState.param, flag: key },
                      });
                    }}
                    placeholder="ör. DIE_AREA, FP_CORE_UTIL"
                  />
                </div>
              </label>
              <label className="block text-[10px] text-slate-500">
                Değer tipi
                <select
                  disabled={locked}
                  value={specState.param.kind}
                  onChange={(e) =>
                    patchSpec({
                      ...specState,
                      param: {
                        ...specState.param,
                        kind: e.target.value as AutonomParamKind,
                      },
                    })
                  }
                  className="mt-0.5 w-full rounded border border-white/10 bg-[#0d1117] px-2 py-1 text-[11px]"
                >
                  <option value="scalar">Tek sayı (ör. 120, 115, 110)</option>
                  <option value="dimension_pair">İki boyut (ör. 150×150)</option>
                  <option value="die_area_rect">DIE_AREA (0 0 W H)</option>
                </select>
              </label>

              {specState.param.kind === "scalar" &&
                renderScalarFields(
                  "Sayı dizisi",
                  {
                    start: String(specState.param.start),
                    target: String(specState.param.target),
                    step: String(specState.param.step),
                  },
                  (v) =>
                    patchSpec({
                      ...specState,
                      param: {
                        ...specState.param,
                        start: num(v.start),
                        target: num(v.target),
                        step: num(v.step),
                      },
                    })
                )}

              {specState.param.kind === "dimension_pair" && (
                <div>
                  {renderScalarFields(
                    "Genişlik (W)",
                    {
                      start: String((specState.param.start as number[])[0] ?? 150),
                      target: String((specState.param.target as number[])[0] ?? 90),
                      step: String((specState.param.step as number[])[0] ?? -5),
                    },
                    (v) => {
                      const st = specState.param.start as number[];
                      const tg = specState.param.target as number[];
                      const sp = specState.param.step as number[];
                      patchSpec({
                        ...specState,
                        param: {
                          ...specState.param,
                          start: [num(v.start), st[1] ?? st[0]],
                          target: [num(v.target), tg[1] ?? tg[0]],
                          step: [num(v.step), sp[1] ?? sp[0]],
                          serialize_as: "times_string",
                        },
                      });
                    }
                  )}
                  {renderScalarFields(
                    "Yükseklik (H)",
                    {
                      start: String((specState.param.start as number[])[1] ?? 150),
                      target: String((specState.param.target as number[])[1] ?? 90),
                      step: String((specState.param.step as number[])[1] ?? -5),
                    },
                    (v) => {
                      const st = specState.param.start as number[];
                      const tg = specState.param.target as number[];
                      const sp = specState.param.step as number[];
                      patchSpec({
                        ...specState,
                        param: {
                          ...specState.param,
                          start: [st[0], num(v.start)],
                          target: [tg[0], num(v.target)],
                          step: [sp[0], num(v.step)],
                          serialize_as: "times_string",
                        },
                      });
                    }
                  )}
                </div>
              )}

              {specState.param.kind === "die_area_rect" && (
                <div className="space-y-2">
                  <p className="text-[10px] text-amber-200/90">
                    DIE_AREA: x1 y1 W H (µm). Config&apos;te FP_SIZING=absolute olmalı.
                  </p>
                  {renderScalarFields(
                    "Genişlik W",
                    {
                      start: String((specState.param.start as number[])[2] ?? 150),
                      target: String((specState.param.target as number[])[2] ?? 90),
                      step: String((specState.param.step as number[])[2] ?? -5),
                    },
                    (v) => {
                      const st = (specState.param.start as number[]) || [0, 0, 150, 150];
                      const tg = (specState.param.target as number[]) || [0, 0, 90, 90];
                      const sp = (specState.param.step as number[]) || [0, 0, -5, -5];
                      patchSpec({
                        ...specState,
                        param: {
                          ...specState.param,
                          flag: "DIE_AREA",
                          start: [st[0], st[1], num(v.start), st[3] ?? st[2]],
                          target: [tg[0], tg[1], num(v.target), tg[3] ?? tg[2]],
                          step: [sp[0], sp[1], num(v.step), sp[3] ?? sp[2]],
                        },
                      });
                    }
                  )}
                  {renderScalarFields(
                    "Yükseklik H",
                    {
                      start: String((specState.param.start as number[])[3] ?? 150),
                      target: String((specState.param.target as number[])[3] ?? 90),
                      step: String((specState.param.step as number[])[3] ?? -5),
                    },
                    (v) => {
                      const st = (specState.param.start as number[]) || [0, 0, 150, 150];
                      const tg = (specState.param.target as number[]) || [0, 0, 90, 90];
                      const sp = (specState.param.step as number[]) || [0, 0, -5, -5];
                      patchSpec({
                        ...specState,
                        param: {
                          ...specState.param,
                          flag: "DIE_AREA",
                          start: [st[0], st[1], st[2], num(v.start)],
                          target: [tg[0], tg[1], tg[2], num(v.target)],
                          step: [sp[0], sp[1], sp[2], num(v.step)],
                        },
                      });
                    }
                  )}
                </div>
              )}

              <p className="text-[10px] text-slate-500">{iterationHint}</p>
            </section>

            <section className="space-y-2 rounded-lg border border-white/10 p-3">
              <p className="text-[11px] font-semibold text-slate-300">Build araçları</p>
              <div className="flex flex-wrap gap-2">
                {BUILD_FLOW_ORDER.map((id) => {
                  const checked = specState.build_actions.includes(id);
                  return (
                    <label
                      key={id}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]",
                        checked
                          ? "border-violet-500/40 bg-violet-500/15 text-violet-200"
                          : "border-white/10 text-slate-500"
                      )}
                    >
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? specState.build_actions.filter((a) => a !== id)
                            : [...specState.build_actions, id];
                          patchSpec({ ...specState, build_actions: next });
                        }}
                        className="h-3 w-3"
                      />
                      {BUILD_LABELS[id] ?? id}
                    </label>
                  );
                })}
              </div>
            </section>

            {hasOpenlane && flowStages.length > 0 && (
              <OpenlaneFlowStagePicker
                stages={flowStages}
                defaultIds={flowDefaultIds}
                selected={
                  specState.openlane_flow_steps?.length
                    ? specState.openlane_flow_steps
                    : flowDefaultIds
                }
                onChange={(ids) =>
                  patchSpec({ ...specState, openlane_flow_steps: ids })
                }
                disabled={locked}
              />
            )}
          </>
        )}

        {step === 2 && preview && (
          <>
            <section className="rounded-lg border border-white/10 p-3">
              <p className="mb-2 text-[11px] font-semibold text-slate-300">
                {preview.iteration_count} iterasyon planlandı
              </p>
              <ul className="max-h-32 overflow-y-auto font-mono text-[10px] text-slate-400">
                {preview.iterations.map((it) => (
                  <li key={it.index}>
                    {it.index + 1}. {it.param_label}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                Etkilenen dosyalar
              </p>
              <div className="max-h-40 overflow-y-auto rounded border border-white/10 p-2">
                <InputFileTreeView
                  keys={preview.input_files}
                  projectId={projectId}
                  readonly
                />
              </div>
            </section>
          </>
        )}

        {logLines.length > 0 && (
          <pre className="max-h-40 overflow-y-auto rounded border border-white/10 bg-[#0d1117] p-2 font-mono text-[10px] text-slate-400">
            {logLines.join("\n")}
          </pre>
        )}

        {error && (
          <p className="flex items-center gap-1 text-[11px] text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </p>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-white/8 bg-[#1a1f26] px-4 py-3 flex gap-2">
        {step === 1 && !campaignId && (
          <button
            type="button"
            disabled={loading || specState.build_actions.length === 0}
            onClick={() => void goToStep2()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            İleri — dosyaları göster
          </button>
        )}
        {step === 2 && !campaignId && (
          <>
            <button
              type="button"
              onClick={() => onChange?.({ step: 1 })}
              className="rounded-lg border border-white/15 px-4 py-2.5 text-sm text-slate-400"
            >
              Geri
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void startCampaign()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Kampanyayı başlat
            </button>
          </>
        )}
        {campaignId && (
          <button
            type="button"
            onClick={() => void cancelAutonomCampaign(campaignId)}
            className="flex-1 rounded-lg border border-rose-500/40 py-2.5 text-sm text-rose-300"
          >
            Kampanyayı iptal et
          </button>
        )}
      </div>
    </div>
  );
}

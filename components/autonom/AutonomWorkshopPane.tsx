"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FlaskConical,
  Info,
  Loader2,
  Play,
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BUILD_FLOW_ORDER } from "@/lib/build-flow";
import { FileAPI } from "@/lib/api";
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

const BUILD_TOOLS: Record<
  string,
  { label: string; short: string; description: string }
> = {
  lint: {
    label: "Lint",
    short: "Lint",
    description:
      "Verilog dosyalarının Yosys ile okunup okunamadığını ve temel RTL sözdizimini kontrol eder.",
  },
  synthesis: {
    label: "RTL Sentez",
    short: "Sentez",
    description:
      "RTL’den gate-level netlist üretir; sentez hatalarını erken yakalamak için kullanılır.",
  },
  verification: {
    label: "Doğrulama",
    short: "Doğrulama",
    description:
      "Hiyerarşi ve modül bağlantılarının tutarlı olduğunu Yosys ile hızlıca doğrular.",
  },
  simulation: {
    label: "Simülasyon",
    short: "Simülasyon",
    description:
      "Testbench varsa iverilog/vvp ile davranış simülasyonu çalıştırır (tb/tb_*.v öncelikli).",
  },
  "openlane1-flow": {
    label: "OpenLane1 Flow",
    short: "PnR Flow",
    description:
      "Seçilen OpenLane aşamalarıyla layout (GDS, DEF, log). Config: openlane/<design>/config.json.",
  },
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
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [showAddFiles, setShowAddFiles] = useState(false);
  const [addFileQuery, setAddFileQuery] = useState("");
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);

  const locked = Boolean(campaignId);
  const selectedFiles = specState.input_files ?? [];
  const suggestedFiles = useMemo(
    () => new Set(preview?.input_files ?? spec.input_files ?? []),
    [preview?.input_files, spec.input_files]
  );
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
    if (locked) return;
    let cancelled = false;
    void FileAPI.listObjects(projectId, "", true).then((objects) => {
      if (cancelled) return;
      const keys = objects
        .map((o) => o.key)
        .filter(
          (k) =>
            k &&
            !k.endsWith("/") &&
            !k.startsWith("_jobs/") &&
            !k.startsWith("_autonom_jobs/")
        )
        .sort();
      setProjectFiles(keys);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, locked]);

  const updateInputFiles = useCallback(
    (next: string[]) => {
      const sorted = [...new Set(next)].sort();
      patchSpec({ ...specState, input_files: sorted });
    },
    [patchSpec, specState]
  );

  const toggleInputFile = useCallback(
    (key: string) => {
      if (selectedFiles.includes(key)) {
        updateInputFiles(selectedFiles.filter((k) => k !== key));
      } else {
        updateInputFiles([...selectedFiles, key]);
      }
    },
    [selectedFiles, updateInputFiles]
  );

  const addInputFiles = useCallback(
    (keys: string[]) => {
      updateInputFiles([...selectedFiles, ...keys]);
    },
    [selectedFiles, updateInputFiles]
  );

  const addFileCandidates = useMemo(() => {
    const q = addFileQuery.trim().toLowerCase();
    const selectedSet = new Set(selectedFiles);
    return projectFiles
      .filter((k) => !selectedSet.has(k))
      .filter((k) => !q || k.toLowerCase().includes(q))
      .slice(0, 80);
  }, [projectFiles, selectedFiles, addFileQuery]);

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
      setLogLines([`Test başladı: ${res.campaign_id}`]);
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
          <button
            type="button"
            disabled={locked}
            onClick={() => onChange?.({ step: 1 })}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] transition-colors",
              step === 1
                ? "bg-violet-600 text-white"
                : "bg-white/10 text-slate-500 hover:bg-white/15 hover:text-slate-300",
              locked && "cursor-default opacity-60"
            )}
          >
            1. Parametre
          </button>
          <ChevronRight className="h-3 w-3 text-slate-600" />
          <button
            type="button"
            disabled={locked}
            onClick={() => {
              if (preview) onChange?.({ step: 2 });
              else void goToStep2();
            }}
            className={cn(
              "rounded px-2 py-0.5 text-[10px] transition-colors",
              step === 2
                ? "bg-violet-600 text-white"
                : "bg-white/10 text-slate-500 hover:bg-white/15 hover:text-slate-300",
              locked && "cursor-default opacity-60"
            )}
          >
            2. Onay
          </button>
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
              <div className="grid gap-2 sm:grid-cols-2">
                {BUILD_FLOW_ORDER.map((id) => {
                  const meta = BUILD_TOOLS[id];
                  const checked = specState.build_actions.includes(id);
                  const expanded = expandedToolId === id;
                  return (
                    <div
                      key={id}
                      className={cn(
                        "relative rounded-lg border p-2.5 transition-all",
                        checked
                          ? "border-violet-500/50 bg-gradient-to-br from-violet-500/20 to-violet-900/10 shadow-[0_0_0_1px_rgba(139,92,246,0.15)]"
                          : "border-white/10 bg-[#0d1117]/80 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
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
                            className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 accent-violet-500"
                          />
                          <span className="text-[11px] font-medium text-slate-200">
                            {meta?.label ?? id}
                          </span>
                          {checked && (
                            <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-violet-400" />
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => setExpandedToolId(expanded ? null : id)}
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-slate-400 transition-colors",
                            expanded
                              ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                              : "border-white/10 hover:border-white/25 hover:text-slate-200"
                          )}
                          aria-label={`${meta?.label ?? id} hakkında bilgi`}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {expanded && meta && (
                        <p className="mt-2 border-t border-white/8 pt-2 text-[10px] leading-relaxed text-slate-400">
                          {meta.description}
                        </p>
                      )}
                    </div>
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
              <p className="mb-2 text-[10px] text-slate-600">
                Her iterasyonda job workspace&apos;e kopyalanır. Listeden ekleyip çıkarabilirsiniz.
              </p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-dashed border-white/10 bg-[#0d1117]/60 p-2">
                <InputFileTreeView
                  keys={selectedFiles}
                  projectId={projectId}
                  suggested={suggestedFiles}
                  onToggle={toggleInputFile}
                  onRemove={(key) =>
                    updateInputFiles(selectedFiles.filter((k) => k !== key))
                  }
                  emptyLabel="Henüz dosya seçilmedi — aşağıdan ekleyin."
                />
              </div>
              {!locked && (
                <>
                  {!showAddFiles ? (
                    <button
                      type="button"
                      onClick={() => setShowAddFiles(true)}
                      className="mt-2 flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-[11px] text-slate-400 hover:border-violet-500/40 hover:text-violet-300"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Projeden dosya ekle
                    </button>
                  ) : (
                    <div className="mt-2 rounded-lg border border-violet-500/25 bg-violet-500/5 p-2">
                      <div className="mb-2 flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-slate-500" />
                        <input
                          value={addFileQuery}
                          onChange={(e) => setAddFileQuery(e.target.value)}
                          placeholder="Dosya yolu ara…"
                          className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddFiles(false);
                            setAddFileQuery("");
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-300"
                        >
                          Kapat
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto rounded border border-white/10 bg-[#0d1117]/40 p-1">
                        <InputFileTreeView
                          keys={addFileCandidates}
                          projectId={projectId}
                          emptyLabel="Eşleşen dosya yok."
                          onAdd={(key) => {
                            addInputFiles([key]);
                            setAddFileQuery("");
                          }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
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
              Testi başlat
            </button>
          </>
        )}
        {campaignId && (
          <button
            type="button"
            onClick={() => void cancelAutonomCampaign(campaignId)}
            className="flex-1 rounded-lg border border-rose-500/40 py-2.5 text-sm text-rose-300"
          >
            Testi iptal et
          </button>
        )}
      </div>
    </div>
  );
}

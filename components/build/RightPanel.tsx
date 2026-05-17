"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X,
  Zap,
  Layers,
  CheckCircle2,
  Play,
  GitBranch,
  Package,
  Info,
  ArrowRight,
  Wrench,
  ScanSearch,
  Cpu,
  Gauge,
  Microscope,
  FileSearch,
  Flame,
  AlertTriangle,
  AlertCircle,
  MessageCircle,
  Eye,
  Code,
  Loader2,
  Clock,
  Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveJob } from "@/lib/active-job-context";
import { analyzeLog } from "@/lib/ai-client";
import { FileAPI } from "@/lib/api";
import { listJobs, getJobLog, listTools } from "@/lib/job-client";
import { openToolRunPreview } from "@/lib/run-tool-with-preview";
import PdkInfoBanner from "./PdkInfoBanner";
import { BuildFlowStrip } from "./BuildFlowStrip";
import { BUILD_FLOW_ORDER } from "@/lib/build-flow";
import type { Job, JobStatus, ObjectInfo, ToolSpec } from "@/lib/types";

/* ─────────────────────────── Types ─────────────────────────── */

export type AgentWorkflowTab = "build" | "tools" | "analysis";

interface ActionCardSpec {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  infoText: string;
  color: string;
  badge?: string;
}

const TOOL_GROUP_LABELS: Record<string, string> = {
  tools: "Test & Doğrulama",
  analysis: "Analiz & Raporlama",
};

const TOOL_UI: Record<string, Pick<ActionCardSpec, "icon" | "color" | "infoText">> = {
  "smoke-test": {
    icon: <Flame className="h-4 w-4" />,
    color: "text-orange-400",
    infoText: "efabless/openlane imajında Yosys ile *.v dosyalarının okunup okunamadığını dener.",
  },
  lint: {
    icon: <ScanSearch className="h-4 w-4" />,
    color: "text-sky-400",
    infoText: "efabless/openlane imajında Yosys ile hiyerarşi ve okunabilirlik kontrolü.",
  },
  simulation: {
    icon: <Play className="h-4 w-4" />,
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    infoText: "efabless/openlane imajında iverilog/vvp varsa tb_*.v ile simülasyon çalıştırır.",
  },
  synthesis: {
    icon: <Layers className="h-4 w-4" />,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    infoText: "efabless/openlane içindeki Yosys ile netlist.v üretir.",
  },
  verification: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    infoText: "efabless/openlane imajında Yosys ile hızlı RTL doğrulaması.",
  },
  pnr: {
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    infoText: "OpenLane PnR akışı; config.json ve OpenLane runner image gerekir.",
  },
  "openlane1-flow": {
    icon: <GitBranch className="h-4 w-4" />,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    infoText:
      "Caravel: openlane/user_project_wrapper/config.json + flow.tcl. Önce user_module macro, sonra wrapper; tam çip için caravel/README.md.",
  },
  gdsii: {
    icon: <Package className="h-4 w-4" />,
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    infoText: "OpenLane GDSII adımı; tam akış tamamlanmadan kullanılmamalı.",
  },
  timing: {
    icon: <Gauge className="h-4 w-4" />,
    color: "text-amber-400",
    infoText: "OpenLane STA adımı; OpenLane runner image gerekir.",
  },
  power: {
    icon: <Cpu className="h-4 w-4" />,
    color: "text-emerald-400",
    infoText: "OpenLane güç raporu adımı.",
  },
  drc: {
    icon: <Microscope className="h-4 w-4" />,
    color: "text-purple-400",
    infoText: "OpenLane DRC adımı.",
  },
  lvs: {
    icon: <FileSearch className="h-4 w-4" />,
    color: "text-teal-400",
    infoText: "OpenLane LVS adımı.",
  },
};

const FALLBACK_TOOLS: ToolSpec[] = [
  { id: "smoke-test", label: "Smoke Test", description: "efabless/openlane içinde Yosys smoke.", image: "", group: "tools", badge: "Hızlı", enabled: true },
  { id: "lint", label: "RTL Lint", description: "efabless/openlane içinde Yosys lint.", image: "", group: "tools", badge: null, enabled: true },
  { id: "simulation", label: "Simülasyon", description: "efabless/openlane içinde iverilog/vvp.", image: "", group: "build", badge: null, enabled: true },
  { id: "synthesis", label: "Sentez", description: "efabless/openlane içinde Yosys sentez.", image: "", group: "build", badge: null, enabled: true },
  { id: "verification", label: "Doğrulama", description: "efabless/openlane içinde Yosys doğrulama.", image: "", group: "build", badge: null, enabled: true },
];

function toActionCard(tool: ToolSpec): ActionCardSpec {
  const ui = TOOL_UI[tool.id];
  return {
    id: tool.id,
    icon: ui?.icon ?? <Wrench className="h-4 w-4" />,
    label: tool.label,
    description: tool.description,
    infoText: ui?.infoText ?? tool.description,
    color: ui?.color ?? "text-slate-400",
    badge: tool.badge ?? undefined,
  };
}

function sortBuildTools(tools: ToolSpec[]): ToolSpec[] {
  const order = new Map(BUILD_FLOW_ORDER.map((id, index) => [id, index]));
  return [...tools].sort((a, b) => (order.get(a.id as (typeof BUILD_FLOW_ORDER)[number]) ?? 99) - (order.get(b.id as (typeof BUILD_FLOW_ORDER)[number]) ?? 99));
}

function groupCatalogTools(tools: ToolSpec[], query = ""): { label: string; items: ActionCardSpec[] }[] {
  const normalized = query.trim().toLowerCase();
  const grouped = new Map<string, ActionCardSpec[]>();
  for (const tool of tools) {
    if (tool.group === "build") continue;
    if (normalized) {
      const haystack = `${tool.id} ${tool.label} ${tool.description}`.toLowerCase();
      if (!haystack.includes(normalized)) continue;
    }
    const label = TOOL_GROUP_LABELS[tool.group] ?? tool.group;
    const items = grouped.get(label) ?? [];
    items.push(toActionCard(tool));
    grouped.set(label, items);
  }
  return Array.from(grouped.entries()).map(([label, items]) => ({ label, items }));
}

/* ─────────────────────────── Action button ─────────────────────────── */

function useToolsCatalog() {
  const [tools, setTools] = useState<ToolSpec[]>(FALLBACK_TOOLS);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    listTools()
      .then((nextTools) => {
        if (cancelled) return;
        setTools(nextTools);
      })
      .catch((error) => {
        if (cancelled) return;
        setCatalogError(error instanceof Error ? error.message : String(error));
        setTools(FALLBACK_TOOLS);
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = useMemo(() => new Set(tools.filter((tool) => tool.enabled).map((tool) => tool.id)), [tools]);
  const buildTools = useMemo(() => sortBuildTools(tools.filter((tool) => tool.group === "build")), [tools]);

  return { tools, enabled, buildTools, catalogError, catalogLoading };
}

function CatalogStatusBanner({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-[11px] text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Araç kataloğu yükleniyor...
      </div>
    );
  }
  if (!error) return null;
  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
      Araç kataloğu alınamadı; yalnızca yerel etkin araç listesi kullanılıyor. {error}
    </div>
  );
}

function MissingProjectBanner() {
  return (
    <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
      Çalıştırmak için sol panelden bir proje seçin.
    </div>
  );
}

function ActionRow({
  spec,
  projectId,
  layout,
  toolEnabled,
}: {
  spec: ActionCardSpec;
  projectId: string;
  layout: "card" | "list";
  toolEnabled: boolean;
}) {
  const { tabs, active } = useActiveJob();
  const [openInfo, setOpenInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const runningCount = tabs.filter(
    (tab) =>
      tab.action === spec.id &&
      !tab.finishedAt &&
      (tab.status === "running" || tab.status === "preparing" || tab.status === "queued")
  ).length;
  const isActiveHere = runningCount > 0;
  const disabled = pending || !toolEnabled || !projectId;

  async function handleRun() {
    if (!projectId) {
      setError("Önce bir proje seç.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await openToolRunPreview(projectId, spec.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPending(false);
    }
  }

  const button = (
    <button
      type="button"
      onClick={handleRun}
      disabled={disabled}
      title={!toolEnabled ? "Bu araç bu sürümde etkin değil" : undefined}
      className={cn(
        "flex h-7 items-center gap-1 rounded border px-2 text-[11px] font-medium flex-shrink-0 transition-all",
        isActiveHere
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : pending
            ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
            : disabled
              ? "border-white/5 bg-white/3 text-slate-700 cursor-not-allowed"
              : "border-white/10 bg-white/5 text-slate-300 hover:border-violet-500/40 hover:text-violet-300"
      )}
    >
      {isActiveHere ? (
        <>
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          {runningCount > 1 ? `${runningCount} çalışıyor` : "Çalışıyor"}
        </>
      ) : pending ? (
        <>
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          Açılıyor
        </>
      ) : (
        <>
          <Play className="h-2.5 w-2.5" />
          Önizle
        </>
      )}
    </button>
  );

  if (layout === "card") {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-3">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", spec.color)}>
            {spec.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{spec.label}</p>
            <p className="text-[11px] text-slate-500">{spec.description}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOpenInfo((v) => !v)}
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded border transition-all",
                openInfo
                  ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                  : "border-white/8 text-slate-600 hover:text-slate-400"
              )}
            >
              <Info className="h-3 w-3" />
            </button>
            {button}
          </div>
        </div>
        {openInfo && (
          <div className="mt-2 rounded-lg border border-violet-500/15 bg-violet-500/8 px-3 py-2">
            <p className="text-[11px] text-slate-300 leading-relaxed">{spec.infoText}</p>
          </div>
        )}
        {error && <p className="mt-2 text-[11px] text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 p-3">
      <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/8", spec.color)}>
        {spec.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium text-white">{spec.label}</p>
          {spec.badge && (
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
              {spec.badge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{spec.description}</p>
        {error && <p className="mt-1 text-[11px] text-rose-400">{error}</p>}
      </div>
      {button}
    </div>
  );
}

/* ─────────────────────────── Tabs ─────────────────────────── */

function BuildTab({
  projectName,
  projectId,
  onOpenWorkspaceFile,
}: {
  projectName: string;
  projectId: string;
  onOpenWorkspaceFile?: (key: string) => void;
}) {
  const { enabled: enabledTools, tools, catalogError, catalogLoading } = useToolsCatalog();
  const buildCards = useMemo(() => {
    const byId = new Map(tools.map((t) => [t.id, t]));
    return BUILD_FLOW_ORDER.map((id) => byId.get(id))
      .filter((t): t is ToolSpec => Boolean(t))
      .map(toActionCard);
  }, [tools]);

  return (
    <div className="flex flex-col gap-2 p-4">
      <PdkInfoBanner />
      <CatalogStatusBanner loading={catalogLoading} error={catalogError} />
      {!projectId && <MissingProjectBanner />}
      <BuildFlowStrip
        projectId={projectId}
        projectName={projectName}
        tools={tools}
        enabledTools={enabledTools}
        onOpenWorkspaceFile={onOpenWorkspaceFile}
      />

      {buildCards.map((opt) => (
        <ActionRow
          key={opt.id}
          spec={opt}
          projectId={projectId}
          layout="card"
          toolEnabled={enabledTools.has(opt.id)}
        />
      ))}
    </div>
  );
}

function ToolsTab({ projectName, projectId }: { projectName: string; projectId: string }) {
  const { enabled: enabledTools, tools, catalogError, catalogLoading } = useToolsCatalog();
  const [query, setQuery] = useState("");
  const toolGroups = useMemo(() => groupCatalogTools(tools, query), [tools, query]);

  return (
    <div className="flex flex-col gap-3 p-4">
      <CatalogStatusBanner loading={catalogLoading} error={catalogError} />
      {!projectId && <MissingProjectBanner />}
      <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
        <p className="text-[10px] text-slate-500 font-medium">
          <span className="text-slate-300">{projectName}</span> — Araç Takımı
        </p>
      </div>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="OpenLane1 araçlarında ara..."
        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-200 placeholder:text-slate-600 focus:border-violet-500/40 focus:outline-none"
      />
      {toolGroups.map((group) => (
        <div key={group.label}>
          <p className="px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            {group.label}
          </p>
          <div className="flex flex-col gap-1.5">
            {group.items.map((tool) => (
              <ActionRow
                key={tool.id}
                spec={tool}
                projectId={projectId}
                layout="list"
                toolEnabled={enabledTools.has(tool.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Analysis tab (job history) ─────────────────────────── */

const STATUS_COLOR: Record<JobStatus, string> = {
  queued: "text-slate-400",
  running: "text-amber-400",
  done: "text-emerald-400",
  failed: "text-rose-400",
  cancelled: "text-slate-500",
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

interface LogEntry {
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  raw: string;
}

function parseLogs(raw: string): LogEntry[] {
  return raw.split("\n").map((line) => {
    const m = line.match(/\[(INFO|WARNING|ERROR)\]\s+(.*)/);
    if (!m) {
      // Backend log formatı [stdout]/[stderr] — stderr'i WARNING gibi göster
      const sm = line.match(/^\[(stdout|stderr|system)\]\s*(.*)$/);
      if (sm) {
        const lvl = sm[1] === "stderr" ? "WARNING" : sm[1] === "system" ? "ERROR" : "INFO";
        return { level: lvl as LogEntry["level"], message: sm[2], raw: line };
      }
      return { level: "INFO", message: line, raw: line };
    }
    return { level: m[1] as LogEntry["level"], message: m[2], raw: line };
  });
}

function AnalysisTab({
  projectId,
  projectName,
  onAskAI,
  onOpenWorkspaceFile,
}: {
  projectId: string;
  projectName: string;
  onAskAI: (msg: string) => void;
  onOpenWorkspaceFile?: (key: string) => void;
}) {
  const { tabs, active, attach } = useActiveJob();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [logText, setLogText] = useState<string>("");
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [artifacts, setArtifacts] = useState<ObjectInfo[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [netlistPreview, setNetlistPreview] = useState<string | null>(null);
  const [netlistLoading, setNetlistLoading] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!projectId) return;
    setJobsLoading(true);
    setJobsError(null);
    try {
      const list = await listJobs(projectId, 50, 0);
      setJobs(list);
      setSelectedId((prev) => {
        if (prev && list.some((job) => job.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (error) {
      setJobsError(error instanceof Error ? error.message : String(error));
    } finally {
      setJobsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs, active?.finishedAt]);

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedId) ?? null, [jobs, selectedId]);
  const liveTab = useMemo(
    () => (selectedJob ? tabs.find((tab) => tab.jobId === selectedJob.id) ?? null : null),
    [selectedJob, tabs]
  );
  const isLiveSelectedJob = Boolean(liveTab && !liveTab.finishedAt);

  useEffect(() => {
    setAiSummary(null);
    setAiError(null);
    setNetlistPreview(null);
  }, [selectedJob?.id]);

  useEffect(() => {
    if (!selectedJob?.artifacts_prefix) {
      setArtifacts([]);
      setArtifactsError(null);
      return;
    }
    let cancelled = false;
    setArtifactsLoading(true);
    setArtifactsError(null);
    FileAPI.listObjects(projectId, selectedJob.artifacts_prefix, true)
      .then((objects) => {
        if (!cancelled) setArtifacts(objects);
      })
      .catch((error) => {
        if (!cancelled) {
          setArtifacts([]);
          setArtifactsError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) setArtifactsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, selectedJob?.artifacts_prefix]);

  const netlistKey = useMemo(() => {
    const fromArtifacts = artifacts.find((item) => item.key.endsWith("netlist.v"))?.key;
    if (fromArtifacts) return fromArtifacts;
    return artifacts.find((item) => item.key.endsWith(".v"))?.key ?? null;
  }, [artifacts]);

  useEffect(() => {
    if (!netlistKey) {
      setNetlistPreview(null);
      return;
    }
    let cancelled = false;
    setNetlistLoading(true);
    FileAPI.getObjectText(projectId, netlistKey)
      .then((text) => {
        if (!cancelled) setNetlistPreview(text);
      })
      .catch(() => {
        if (!cancelled) setNetlistPreview(null);
      })
      .finally(() => {
        if (!cancelled) setNetlistLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [netlistKey, projectId]);

  useEffect(() => {
    if (!selectedJob) return;
    if (isLiveSelectedJob && liveTab) {
      const streamed = liveTab.lines.map((line) => `[${line.stream}] ${line.line}`).join("\n");
      setLogText(streamed);
      setLogLoading(false);
      setLogError(
        streamed.length > 0
          ? null
          : "Canlı izleme — ayrıntılı akış için alttaki terminali kullanın."
      );
      return;
    }
    if (!selectedJob.log_object_key) {
      setLogText("");
      setLogError(selectedJob.status === "running" ? "Job hâlâ çalışıyor — log henüz yüklenmedi." : "Bu job için log mevcut değil.");
      return;
    }
    let cancelled = false;
    setLogLoading(true);
    setLogError(null);
    getJobLog(selectedJob.id)
      .then((text) => {
        if (!cancelled) setLogText(text);
      })
      .catch((e) => {
        if (!cancelled) setLogError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [liveTab, isLiveSelectedJob, selectedJob]);

  const entries = useMemo(() => parseLogs(logText), [logText]);
  const errors = entries.filter((e) => e.level === "ERROR");
  const warnings = entries.filter((e) => e.level === "WARNING");

  if (!projectId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-slate-500">
        Önce sol panelden bir proje seç.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="rounded-lg border border-white/8 bg-white/3 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
            {projectName} — Geçmiş Çalıştırmalar
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void loadJobs()}
              disabled={jobsLoading}
              className="flex h-6 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[10px] font-medium text-slate-400 hover:text-slate-200 disabled:opacity-50"
              title="Listeyi yenile"
            >
              {jobsLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
              Yenile
            </button>
            {selectedJob && (
              <button
                type="button"
                onClick={() => void attach(selectedJob.id, selectedJob.project_id, selectedJob.action)}
                className="flex items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300 hover:bg-violet-500/15"
                title="Terminale yükle"
              >
                <Eye className="h-2.5 w-2.5" /> Terminale yükle
              </button>
            )}
          </div>
        </div>
        {jobsError && <p className="mb-2 text-[11px] text-rose-400">{jobsError}</p>}
        {jobsLoading && jobs.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-3 text-[11px] text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Çalıştırmalar yükleniyor...
          </p>
        ) : jobs.length === 0 ? (
          <p className="text-center text-[11px] text-slate-600 py-3">Henüz çalıştırma yok.</p>
        ) : (
          <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
            {jobs.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => setSelectedId(j.id)}
                className={cn(
                  "flex items-center gap-2 rounded border border-white/5 px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-white/5",
                  selectedId === j.id && "border-violet-500/40 bg-violet-500/10"
                )}
              >
                <Bug className={cn("h-3 w-3 flex-shrink-0", STATUS_COLOR[j.status])} />
                <span className="flex-1 truncate text-slate-300 font-medium">{j.action}</span>
                <span className="text-slate-600 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(j.created_at)}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-px text-[9px] font-medium",
                    j.status === "done" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                    j.status === "failed" && "border-rose-500/30 bg-rose-500/10 text-rose-400",
                    j.status === "running" && "border-amber-500/30 bg-amber-500/10 text-amber-400",
                    j.status === "cancelled" && "border-slate-500/30 bg-slate-500/10 text-slate-400",
                    j.status === "queued" && "border-slate-500/30 bg-slate-500/10 text-slate-400"
                  )}
                >
                  {j.status}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedJob && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg border border-white/8 bg-white/3 p-3">
              <p className="text-[10px] text-slate-500 mb-1 font-medium">{selectedJob.action} — Özet</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs font-semibold text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.length} Hata
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> {warnings.length} Uyarı
                </span>
                {selectedJob.exit_code !== null && (
                  <span className="text-[11px] text-slate-500">exit {selectedJob.exit_code}</span>
                )}
              </div>
            </div>
            <div className="flex rounded-lg border border-white/8 bg-white/3 p-1 gap-1">
              <button
                type="button"
                onClick={() => setShowRaw(false)}
                className={cn(
                  "flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-all",
                  !showRaw ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Eye className="h-3 w-3" /> Analiz
              </button>
              <button
                type="button"
                onClick={() => setShowRaw(true)}
                className={cn(
                  "flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-all",
                  showRaw ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Code className="h-3 w-3" /> Ham
              </button>
            </div>
          </div>

          {isLiveSelectedJob && (
            <p className="text-[11px] text-amber-300">
              Seçili job canlı çalışıyor; satırlar terminal ile eşzamanlı güncellenir.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={aiLoading || !logText}
              onClick={() => {
                setAiLoading(true);
                setAiError(null);
                void analyzeLog(logText)
                  .then((summary) => setAiSummary(summary))
                  .catch((error) => setAiError(error instanceof Error ? error.message : String(error)))
                  .finally(() => setAiLoading(false));
              }}
              className="flex h-7 items-center gap-1 rounded border border-violet-500/30 bg-violet-500/10 px-2 text-[11px] font-medium text-violet-300 disabled:opacity-50"
            >
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
              Logu AI ile özetle
            </button>
            {netlistKey && onOpenWorkspaceFile && (
              <button
                type="button"
                onClick={() => onOpenWorkspaceFile(netlistKey)}
                className="flex h-7 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[11px] font-medium text-slate-300"
              >
                <Code className="h-3 w-3" />
                Netlisti editörde aç
              </button>
            )}
          </div>
          {aiError && <p className="text-[11px] text-rose-400">{aiError}</p>}
          {aiSummary && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-violet-300">AI özeti</p>
              <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-300">{aiSummary}</p>
            </div>
          )}

          {(artifactsLoading || artifacts.length > 0 || artifactsError) && (
            <div className="rounded-lg border border-white/8 bg-white/3 p-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Artefaktlar</p>
              {artifactsLoading && (
                <p className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Artefaktlar yükleniyor...
                </p>
              )}
              {artifactsError && <p className="text-[11px] text-rose-400">{artifactsError}</p>}
              {!artifactsLoading && artifacts.length === 0 && !artifactsError && (
                <p className="text-[11px] text-slate-600">Bu çalıştırma için artefakt listesi boş.</p>
              )}
              <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                {artifacts.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onOpenWorkspaceFile?.(item.key)}
                    disabled={!onOpenWorkspaceFile}
                    className="truncate rounded border border-white/5 px-2 py-1 text-left text-[11px] text-slate-300 hover:bg-white/5 disabled:cursor-default disabled:opacity-70"
                  >
                    {item.key.replace(selectedJob.artifacts_prefix ?? "", "").replace(/^\//, "") || item.key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {netlistKey && (
            <div className="rounded-xl border border-white/8 bg-[#0d1117] p-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Netlist önizleme</p>
              {netlistLoading ? (
                <p className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Netlist yükleniyor...
                </p>
              ) : (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-400">
                  {netlistPreview ?? "(netlist okunamadı)"}
                </pre>
              )}
            </div>
          )}

          {logLoading && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Log getiriliyor...
            </div>
          )}
          {logError && <p className="text-[11px] text-rose-400">{logError}</p>}

          {!logLoading && (
            showRaw ? (
              <div className="rounded-xl border border-white/8 bg-[#0d1117] p-3 overflow-x-auto max-h-[60vh]">
                <pre className="text-[11px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">{logText || "(boş)"}</pre>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {errors.length === 0 && warnings.length === 0 && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs text-emerald-300 font-medium">Hata ve uyarı bulunamadı</p>
                  </div>
                )}
                {errors.length > 0 && (
                  <div>
                    <p className="px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-rose-600">
                      Hatalar ({errors.length})
                    </p>
                    {errors.slice(0, 50).map((e, i) => (
                      <LogEntryCard key={i} entry={e} onAskAI={onAskAI} projectName={projectName} />
                    ))}
                  </div>
                )}
                {warnings.length > 0 && (
                  <div>
                    <p className="px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                      Uyarılar ({warnings.length})
                    </p>
                    {warnings.slice(0, 50).map((e, i) => (
                      <LogEntryCard key={i} entry={e} onAskAI={onAskAI} projectName={projectName} />
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

function LogEntryCard({
  entry,
  onAskAI,
  projectName,
}: {
  entry: LogEntry;
  onAskAI: (msg: string) => void;
  projectName: string;
}) {
  const isError = entry.level === "ERROR";
  return (
    <div
      className={cn(
        "mb-1.5 rounded-xl border p-3",
        isError ? "border-rose-500/20 bg-rose-500/8" : "border-amber-500/20 bg-amber-500/8"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">
          {isError ? (
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          )}
        </span>
        <p className="text-[11px] leading-relaxed text-slate-300 flex-1 font-mono">{entry.message}</p>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() =>
            onAskAI(
              `${projectName} projesinde şu ${isError ? "hata" : "uyarı"} ile karşılaştım, nasıl çözebilirim?\n\n\`\`\`\n${entry.raw}\n\`\`\``
            )
          }
          className="flex items-center gap-1 rounded-lg border border-violet-500/25 bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-300 hover:border-violet-400/40 hover:bg-violet-500/15 transition-all"
        >
          <MessageCircle className="h-3 w-3" />
          AI Ajana Sor
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Panel ─────────────────────────── */

export function AgentWorkflowBody({
  activeTab,
  projectId,
  projectName,
  onAskAI,
  onOpenWorkspaceFile,
}: {
  activeTab: AgentWorkflowTab;
  projectId: string;
  projectName: string;
  onAskAI: (msg: string) => void;
  onOpenWorkspaceFile?: (key: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {activeTab === "build" && (
        <BuildTab
          projectName={projectName}
          projectId={projectId}
          onOpenWorkspaceFile={onOpenWorkspaceFile}
        />
      )}
      {activeTab === "tools" && <ToolsTab projectName={projectName} projectId={projectId} />}
      {activeTab === "analysis" && (
        <AnalysisTab
          projectId={projectId}
          projectName={projectName}
          onAskAI={onAskAI}
          onOpenWorkspaceFile={onOpenWorkspaceFile}
        />
      )}
    </div>
  );
}

interface RightPanelProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onAskAI: (msg: string) => void;
  defaultTab?: AgentWorkflowTab;
}

export default function RightPanel({
  open,
  onClose,
  projectId,
  projectName,
  onAskAI,
  defaultTab = "build",
}: RightPanelProps) {
  const [tab, setTab] = useState<AgentWorkflowTab>(defaultTab);

  if (!open) return null;

  const TABS: { id: AgentWorkflowTab; label: string; icon: React.ReactNode }[] = [
    { id: "build", label: "Derleme", icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "tools", label: "Araç Takımı", icon: <Wrench className="h-3.5 w-3.5" /> },
    { id: "analysis", label: "Analiz", icon: <ScanSearch className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="absolute right-0 top-0 h-full w-[440px] flex flex-col border-l border-white/10 bg-[#0d1117] shadow-2xl z-30">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <p className="text-xs font-semibold text-slate-400">{projectName}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-white/8 hover:text-slate-300 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex border-b border-white/8 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-all",
              tab === t.id
                ? "border-violet-500 text-violet-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <AgentWorkflowBody
        activeTab={tab}
        projectId={projectId}
        projectName={projectName}
        onAskAI={(msg) => {
          onAskAI(msg);
          onClose();
        }}
      />
    </div>
  );
}

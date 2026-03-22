"use client";

import { useState } from "react";
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
  CircleDot,
  Wrench,
  FlaskConical,
  ScanSearch,
  Cpu,
  ChevronDown,
  Terminal,
  Network,
  Gauge,
  Microscope,
  FileSearch,
  Flame,
  AlertTriangle,
  AlertCircle,
  MessageCircle,
  Eye,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_LOG_OUTPUT } from "@/lib/mock-fs";

/* ─────────────────────────── Types ─────────────────────────── */

type Tab = "build" | "tools" | "analysis";

interface BuildOption {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  infoText: string;
  color: string;
}

const BUILD_OPTIONS: BuildOption[] = [
  {
    id: "synthesis",
    icon: <Layers className="h-4 w-4" />,
    label: "Sentez",
    description: "RTL → Netlist",
    infoText: "OpenLane sentez adımını çalıştırır. Verilog kaynak dosyalarınızı mantık kapılarına dönüştürür. Yosys sentez aracını kullanır.",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
  },
  {
    id: "verification",
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Doğrulama",
    description: "RTL Lint & Formal",
    infoText: "Icarus Verilog (iverilog) ile RTL doğrulaması yapar. Test bench dosyalarınızın mevcut olması gerekir.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "simulation",
    icon: <Play className="h-4 w-4" />,
    label: "Simülasyon",
    description: "GTKWave ile görselleştir",
    infoText: "GTKWave kullanarak dalga formu simülasyonu başlatır. Cihazınızda GTKWave yüklü olmalıdır.",
    color: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  {
    id: "pnr",
    icon: <GitBranch className="h-4 w-4" />,
    label: "Fiziksel Tasarım",
    description: "Place & Route",
    infoText: "OpenLane PnR akışını çalıştırır. Yerleştirme ve yönlendirme adımlarını gerçekleştirir.",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "gdsii",
    icon: <Package className="h-4 w-4" />,
    label: "GDSII Dışa Aktarma",
    description: "Final tapeout",
    infoText: "Nihai GDSII dosyasını oluşturur. Akış tamamlanmadan çalıştırılmamalıdır.",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
];

interface ToolItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: string;
  color: string;
}

const TOOL_GROUPS: { label: string; items: ToolItem[] }[] = [
  {
    label: "Test & Doğrulama",
    items: [
      {
        id: "smoke-test",
        icon: <Flame className="h-4 w-4" />,
        label: "Smoke Test",
        description: "Temel derleme ve elaborasyon kontrolü yapar. Hızlı bir sağlık kontrolüdür.",
        badge: "Hızlı",
        color: "text-orange-400",
      },
      {
        id: "lint",
        icon: <ScanSearch className="h-4 w-4" />,
        label: "RTL Lint",
        description: "Verilog/SystemVerilog kaynak kodunu lint kurallarına göre analiz eder.",
        color: "text-sky-400",
      },
      {
        id: "formal",
        icon: <FlaskConical className="h-4 w-4" />,
        label: "Formal Doğrulama",
        description: "SymbiYosys ile formal doğrulama çalıştırır. Assertion tabanlı kontrol.",
        color: "text-violet-400",
      },
    ],
  },
  {
    label: "Analiz & Raporlama",
    items: [
      {
        id: "timing",
        icon: <Gauge className="h-4 w-4" />,
        label: "Timing Analizi",
        description: "OpenSTA ile statik timing analizi. Setup ve hold zamanlarını kontrol eder.",
        color: "text-amber-400",
      },
      {
        id: "power",
        icon: <Cpu className="h-4 w-4" />,
        label: "Güç Analizi",
        description: "Tasarımın statik ve dinamik güç tüketimini analiz eder.",
        color: "text-emerald-400",
      },
      {
        id: "netlist-view",
        icon: <Network className="h-4 w-4" />,
        label: "Netlist Görüntüleyici",
        description: "Sentez sonrası netlist'i interaktif şema olarak görselleştirir.",
        color: "text-rose-400",
      },
    ],
  },
  {
    label: "Yardımcı Araçlar",
    items: [
      {
        id: "drc",
        icon: <Microscope className="h-4 w-4" />,
        label: "DRC Kontrolü",
        description: "Design Rule Check. Fiziksel tasarım kurallarını doğrular.",
        color: "text-purple-400",
      },
      {
        id: "lvs",
        icon: <FileSearch className="h-4 w-4" />,
        label: "LVS Kontrolü",
        description: "Layout vs Schematic. Çıkarılan netlist ile şemayı karşılaştırır.",
        color: "text-teal-400",
      },
      {
        id: "terminal",
        icon: <Terminal className="h-4 w-4" />,
        label: "Nix Shell",
        description: "LibreLane ortamında interaktif terminal oturumu başlatır.",
        color: "text-slate-400",
      },
    ],
  },
];

/* ─────────────────────────── Log parser ─────────────────────────── */

interface LogEntry {
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  raw: string;
}

function parseLogs(raw: string): LogEntry[] {
  return raw.split("\n").map((line) => {
    const m = line.match(/\[(INFO|WARNING|ERROR)\]\s+(.*)/);
    if (!m) return { level: "INFO" as const, message: line, raw: line };
    return { level: m[1] as LogEntry["level"], message: m[2], raw: line };
  });
}

/* ─────────────────────────── Sub-panels ─────────────────────────── */

function BuildTab({ projectName, running, onRun }: { projectName: string; running: string | null; onRun: (id: string) => void }) {
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const completedIdx = running ? BUILD_OPTIONS.findIndex((o) => o.id === running) - 1 : -1;

  return (
    <div className="flex flex-col gap-2 p-4">
      {/* Flow indicator */}
      <div className="rounded-lg border border-white/8 bg-white/3 p-3 mb-1">
        <p className="text-[10px] text-slate-500 mb-2 font-medium uppercase tracking-wider">
          {projectName} — Akış Sırası
        </p>
        <div className="flex items-center gap-1 flex-wrap">
          {BUILD_OPTIONS.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-1">
              <div className={cn(
                "flex h-6 items-center gap-1 px-2 rounded-full text-[10px] font-medium border",
                i <= completedIdx
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                  : running && BUILD_OPTIONS.findIndex((o) => o.id === running) === i
                  ? "bg-amber-500/20 border-amber-500/30 text-amber-400 animate-pulse"
                  : "bg-white/5 border-white/10 text-slate-500"
              )}>
                <span>{i + 1}</span>
                <span className="hidden sm:block">{opt.label}</span>
              </div>
              {i < BUILD_OPTIONS.length - 1 && (
                <ArrowRight className="h-3 w-3 text-slate-700 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {BUILD_OPTIONS.map((opt) => (
        <div key={opt.id} className="rounded-xl border border-white/8 bg-white/3 p-3">
          <div className="flex items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", opt.color)}>
              {opt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{opt.label}</p>
              <p className="text-[11px] text-slate-500">{opt.description}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpenInfo(openInfo === opt.id ? null : opt.id)}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded border transition-all",
                  openInfo === opt.id
                    ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                    : "border-white/8 text-slate-600 hover:text-slate-400"
                )}
              >
                <Info className="h-3 w-3" />
              </button>
              <button
                onClick={() => onRun(opt.id)}
                disabled={running !== null}
                className={cn(
                  "flex h-6 items-center gap-1 px-2 rounded border text-[11px] font-medium transition-all",
                  running === opt.id
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    : running !== null
                    ? "border-white/5 bg-white/3 text-slate-700 cursor-not-allowed"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-violet-500/40 hover:text-violet-300"
                )}
              >
                {running === opt.id ? (
                  <><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Çalışıyor</>
                ) : (
                  <><Play className="h-2.5 w-2.5" />Çalıştır</>
                )}
              </button>
            </div>
          </div>
          {openInfo === opt.id && (
            <div className="mt-2 rounded-lg border border-violet-500/15 bg-violet-500/8 px-3 py-2">
              <p className="text-[11px] text-slate-300 leading-relaxed">{opt.infoText}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ToolsTab({ projectName }: { projectName: string }) {
  const [runningTool, setRunningTool] = useState<string | null>(null);

  function handleRun(id: string) {
    setRunningTool(id);
    setTimeout(() => setRunningTool(null), 2500);
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="rounded-lg border border-white/8 bg-white/3 px-3 py-2">
        <p className="text-[10px] text-slate-500 font-medium">
          <span className="text-slate-300">{projectName}</span> — Araç Takımı
        </p>
      </div>
      {TOOL_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600">{group.label}</p>
          <div className="flex flex-col gap-1.5">
            {group.items.map((tool) => (
              <div key={tool.id} className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/3 p-3">
                <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/8", tool.color)}>
                  {tool.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-white">{tool.label}</p>
                    {tool.badge && (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{tool.description}</p>
                </div>
                <button
                  onClick={() => handleRun(tool.id)}
                  disabled={runningTool !== null}
                  className={cn(
                    "flex h-7 items-center gap-1 rounded-lg px-2.5 text-[11px] font-medium border flex-shrink-0 transition-all",
                    runningTool === tool.id
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      : runningTool !== null
                      ? "border-white/5 bg-white/3 text-slate-700 cursor-not-allowed"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-violet-500/40 hover:text-violet-300"
                  )}
                >
                  {runningTool === tool.id ? (
                    <><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Çalışıyor</>
                  ) : (
                    <><Play className="h-2.5 w-2.5" />Çalıştır</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysisTab({
  projectId,
  projectName,
  onAskAI,
}: {
  projectId: string;
  projectName: string;
  onAskAI: (msg: string) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const rawLog = MOCK_LOG_OUTPUT[projectId] ?? "[INFO] Henüz analiz çıktısı mevcut değil.";
  const entries = parseLogs(rawLog);
  const errors = entries.filter((e) => e.level === "ERROR");
  const warnings = entries.filter((e) => e.level === "WARNING");

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Header stats */}
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg border border-white/8 bg-white/3 p-3">
          <p className="text-[10px] text-slate-500 mb-1 font-medium">{projectName} — Son Çalıştırma</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs font-semibold text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" /> {errors.length} Hata
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" /> {warnings.length} Uyarı
            </span>
          </div>
        </div>
        {/* Raw / Analyzed toggle */}
        <div className="flex rounded-lg border border-white/8 bg-white/3 p-1 gap-1">
          <button
            onClick={() => setShowRaw(false)}
            className={cn(
              "flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium transition-all",
              !showRaw ? "bg-violet-500/20 text-violet-300" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Eye className="h-3 w-3" /> Analiz
          </button>
          <button
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

      {showRaw ? (
        <div className="rounded-xl border border-white/8 bg-[#0d1117] p-3 overflow-x-auto">
          <pre className="text-[11px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap">{rawLog}</pre>
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
              {errors.map((e, i) => (
                <LogEntryCard key={i} entry={e} onAskAI={onAskAI} projectName={projectName} />
              ))}
            </div>
          )}

          {warnings.length > 0 && (
            <div>
              <p className="px-1 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                Uyarılar ({warnings.length})
              </p>
              {warnings.map((e, i) => (
                <LogEntryCard key={i} entry={e} onAskAI={onAskAI} projectName={projectName} />
              ))}
            </div>
          )}
        </div>
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
    <div className={cn(
      "mb-1.5 rounded-xl border p-3",
      isError
        ? "border-rose-500/20 bg-rose-500/8"
        : "border-amber-500/20 bg-amber-500/8"
    )}>
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

interface RightPanelProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  onAskAI: (msg: string) => void;
  defaultTab?: Tab;
}

export default function RightPanel({
  open,
  onClose,
  projectId,
  projectName,
  onAskAI,
  defaultTab = "build",
}: RightPanelProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [running, setRunning] = useState<string | null>(null);

  function handleRun(id: string) {
    setRunning(id);
    setTimeout(() => setRunning(null), 3000);
  }

  if (!open) return null;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "build", label: "Derleme", icon: <Zap className="h-3.5 w-3.5" /> },
    { id: "tools", label: "Araç Takımı", icon: <Wrench className="h-3.5 w-3.5" /> },
    { id: "analysis", label: "Analiz", icon: <ScanSearch className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="absolute right-0 top-0 h-full w-[440px] flex flex-col border-l border-white/10 bg-[#0d1117] shadow-2xl z-30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0">
        <p className="text-xs font-semibold text-slate-400">{projectName}</p>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-white/8 hover:text-slate-300 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8 flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "build" && <BuildTab projectName={projectName} running={running} onRun={handleRun} />}
        {tab === "tools" && <ToolsTab projectName={projectName} />}
        {tab === "analysis" && (
          <AnalysisTab
            projectId={projectId}
            projectName={projectName}
            onAskAI={(msg) => { onAskAI(msg); onClose(); }}
          />
        )}
      </div>
    </div>
  );
}

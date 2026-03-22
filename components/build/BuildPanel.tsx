"use client";

import { useState } from "react";
import {
  Layers,
  CheckCircle2,
  Play,
  GitBranch,
  Package,
  Info,
  X,
  Zap,
  CircleDot,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BuildOption {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  infoText: string;
  color: string;
  glowColor: string;
}

const BUILD_OPTIONS: BuildOption[] = [
  {
    id: "synthesis",
    icon: <Layers className="h-5 w-5" />,
    label: "Sentez",
    description: "RTL → Netlist",
    infoText:
      "OpenLane sentez adımını çalıştırır. Verilog kaynak dosyalarınızı mantık kapılarına (gate-level netlist) dönüştürür. Yosys sentez aracını kullanır.",
    color: "text-violet-400",
    glowColor: "shadow-violet-500/20",
  },
  {
    id: "verification",
    icon: <CheckCircle2 className="h-5 w-5" />,
    label: "Doğrulama",
    description: "RTL Lint & Formal",
    infoText:
      "Icarus Verilog (iverilog) ile RTL doğrulaması yapar. Test bench dosyalarınızın mevcut olması gerekir. Tasarım hatalarını sentez öncesinde tespit eder.",
    color: "text-emerald-400",
    glowColor: "shadow-emerald-500/20",
  },
  {
    id: "simulation",
    icon: <Play className="h-5 w-5" />,
    label: "Simülasyon",
    description: "GTKWave ile görselleştir",
    infoText:
      "GTKWave kullanarak dalga formu simülasyonu başlatır. Cihazınızda GTKWave yüklü olmalıdır. VCD dosyası otomatik olarak oluşturulur.",
    color: "text-sky-400",
    glowColor: "shadow-sky-500/20",
  },
  {
    id: "pnr",
    icon: <GitBranch className="h-5 w-5" />,
    label: "Fiziksel Tasarım",
    description: "Place & Route",
    infoText:
      "OpenLane PnR akışını çalıştırır. Yerleştirme (placement) ve yönlendirme (routing) adımlarını gerçekleştirir. PDK konfigürasyonunuzun doğru ayarlandığından emin olun.",
    color: "text-amber-400",
    glowColor: "shadow-amber-500/20",
  },
  {
    id: "gdsii",
    icon: <Package className="h-5 w-5" />,
    label: "GDSII Dışa Aktarma",
    description: "Final tapeout dosyası",
    infoText:
      "Nihai GDSII dosyasını oluşturur. Akışın tüm adımları tamamlanmadan çalıştırılmamalıdır. DRC ve LVS kontrollerinin temiz çıkması önerilir.",
    color: "text-rose-400",
    glowColor: "shadow-rose-500/20",
  },
];

interface BuildPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function BuildPanel({ open, onClose }: BuildPanelProps) {
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  function handleRun(id: string) {
    setRunning(id);
    setTimeout(() => setRunning(null), 3000);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-[420px] flex-col border-l border-white/10 bg-[#0d1117]/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Derleme Menüsü</p>
              <p className="text-[11px] text-slate-500">LibreLane / OpenLane akışı</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white/8 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Flow indicator */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-white/5">
          {BUILD_OPTIONS.map((opt, i) => (
            <div key={opt.id} className="flex items-center gap-1">
              <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold",
                "border-white/10 bg-white/5 text-slate-400"
              )}>
                {i + 1}
              </div>
              {i < BUILD_OPTIONS.length - 1 && (
                <ArrowRight className="h-3 w-3 text-slate-700" />
              )}
            </div>
          ))}
          <span className="ml-2 text-[10px] text-slate-600 font-medium">Önerilen sıra</span>
        </div>

        {/* Options */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {BUILD_OPTIONS.map((opt) => (
            <div key={opt.id} className="group">
              <div className={cn(
                "relative rounded-xl border border-white/8 bg-white/3 p-4 transition-all duration-200",
                "hover:border-white/15 hover:bg-white/5",
                running === opt.id && "border-white/20 bg-white/8"
              )}>
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 border border-white/8 transition-all",
                      `shadow-lg ${opt.glowColor}`,
                      opt.color
                    )}>
                      {opt.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{opt.label}</p>
                      <p className="text-[11px] text-slate-500">{opt.description}</p>
                    </div>
                  </div>

                  {/* Info button */}
                  <button
                    onClick={() => setActiveInfo(activeInfo === opt.id ? null : opt.id)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
                      activeInfo === opt.id
                        ? "border-violet-500/50 bg-violet-500/15 text-violet-400"
                        : "border-white/10 bg-white/5 text-slate-500 hover:border-white/20 hover:text-slate-300"
                    )}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Info text */}
                {activeInfo === opt.id && (
                  <div className="mb-3 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2">
                    <p className="text-[11px] leading-relaxed text-slate-300">{opt.infoText}</p>
                  </div>
                )}

                {/* Action area */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CircleDot className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] text-slate-500 font-medium">Hazır</span>
                  </div>

                  <button
                    onClick={() => handleRun(opt.id)}
                    disabled={running !== null}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                      running === opt.id
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 cursor-not-allowed"
                        : running !== null
                        ? "bg-white/5 text-slate-600 cursor-not-allowed"
                        : "bg-white/8 text-slate-300 border border-white/10 hover:bg-violet-500/20 hover:text-violet-300 hover:border-violet-500/30"
                    )}
                  >
                    {running === opt.id ? (
                      <>
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        Çalışıyor...
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" />
                        Çalıştır
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-3">
          <p className="text-[10px] text-slate-600 text-center">
            Tüm işlemler mock modunda çalışmaktadır
          </p>
        </div>
      </div>
    </>
  );
}

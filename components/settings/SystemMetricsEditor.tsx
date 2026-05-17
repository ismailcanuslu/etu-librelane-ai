"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Cpu,
  HardDrive,
  Loader2,
  MemoryStick,
  Monitor,
  Network,
  RefreshCw,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemMetricsPayload } from "@/lib/types";

function UsageBar({ percent, className }: { percent: number; className?: string }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-white/10", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          p >= 90 ? "bg-rose-500" : p >= 70 ? "bg-amber-500" : "bg-emerald-500"
        )}
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

function MetricCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-white/10 bg-[#0d1117]/80 p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2 text-slate-200">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-violet-300">
          {icon}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}g ${h}s ${m}dk`;
  if (h > 0) return `${h}s ${m}dk`;
  return `${m} dk`;
}

export default function SystemMetricsEditor() {
  const [data, setData] = useState<SystemMetricsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/system/metrics", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as SystemMetricsPayload & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error ?? `Metrikler alınamadı (${res.status})`);
      }
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [autoRefresh, load]);

  if (loading && !data) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 bg-[#1e1e1e] text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Sistem metrikleri okunuyor…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-slate-100">Sistem metrikleri</p>
            <p className="text-[10px] text-slate-500">
              {data?.runtime?.metrics_scope_label ??
                (data?.runtime?.in_docker ? "Docker container" : "Yerel makine")}
              {data ? ` · ${data.hostname}` : ""}
              {data ? ` · ${formatUptime(data.uptime_seconds)}` : ""}
            </p>
            {data?.runtime?.privileged_hint && (
              <p className="mt-0.5 text-[10px] text-emerald-400/90">
                pid:host + privileged — CPU/RAM/disk/ağ fiziksel sunucudan okunuyor
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-500">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-white/20"
            />
            Otomatik (4s)
          </label>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
            className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Yenile
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {error && (
          <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        {data && (
          <div className="grid gap-4 lg:grid-cols-2">
            <MetricCard title="İşlemci (CPU)" icon={<Cpu className="h-4 w-4" />}>
              <p className="mb-2 text-[11px] leading-relaxed text-slate-400">{data.cpu.model}</p>
              <div className="mb-2 flex justify-between text-[10px] text-slate-500">
                <span>
                  {data.cpu.physical_cores ?? "?"} fiziksel / {data.cpu.logical_cores ?? "?"}{" "}
                  mantıksal çekirdek
                </span>
                <span className="font-mono text-slate-300">%{data.cpu.usage_percent}</span>
              </div>
              <UsageBar percent={data.cpu.usage_percent} />
              {data.cpu.frequency_mhz.current != null && (
                <p className="mt-2 text-[10px] text-slate-500">
                  Saat: {data.cpu.frequency_mhz.current} MHz
                  {data.cpu.frequency_mhz.max != null
                    ? ` (maks ${data.cpu.frequency_mhz.max} MHz)`
                    : ""}
                </p>
              )}
            </MetricCard>

            <MetricCard title="Bellek (RAM)" icon={<MemoryStick className="h-4 w-4" />}>
              <div className="mb-1 flex justify-between text-xs text-slate-300">
                <span>
                  {data.memory.used_human ?? "—"} / {data.memory.total_human ?? "—"}
                </span>
                <span className="font-mono">%{data.memory.usage_percent}</span>
              </div>
              <UsageBar percent={data.memory.usage_percent} />
              <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                {data.memory.type && <p>Tip: {data.memory.type}</p>}
                {data.memory.speed_mhz != null && <p>Hız: {data.memory.speed_mhz} MHz</p>}
                {data.memory.swap_total_bytes > 0 && (
                  <p>
                    Swap: %{data.memory.swap_usage_percent} (
                    {Math.round(data.memory.swap_used_bytes / 1024 / 1024)} MiB)
                  </p>
                )}
                {!data.memory.type && !data.memory.speed_mhz && (
                  <p className="text-slate-600">
                    RAM tipi/hız için imajda dmidecode gerekir (privileged host DMI erişimi).
                  </p>
                )}
              </div>
            </MetricCard>

            <MetricCard
              title="Ekran kartı (GPU)"
              icon={<Monitor className="h-4 w-4" />}
              className="lg:col-span-2"
            >
              {data.gpus.length === 0 ? (
                <p className="text-[11px] text-slate-500">
                  NVIDIA GPU bulunamadı (nvidia-smi yok) veya macOS entegre GPU bilgisi okunamadı.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.gpus.map((gpu, i) => (
                    <div
                      key={`${gpu.name}-${i}`}
                      className="rounded-lg border border-white/8 bg-white/[0.03] p-3"
                    >
                      <p className="text-[11px] font-medium text-slate-200">{gpu.name}</p>
                      {gpu.vendor && (
                        <p className="text-[10px] text-slate-500">{gpu.vendor}</p>
                      )}
                      {gpu.utilization_percent != null && (
                        <>
                          <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                            <span>Kullanım</span>
                            <span>%{gpu.utilization_percent}</span>
                          </div>
                          <UsageBar percent={gpu.utilization_percent} className="mt-1" />
                        </>
                      )}
                      {gpu.memory_total_human && (
                        <p className="mt-2 text-[10px] text-slate-500">
                          VRAM: {gpu.memory_used_human ?? "—"} / {gpu.memory_total_human}
                        </p>
                      )}
                      {gpu.temperature_c != null && (
                        <p className="text-[10px] text-slate-500">{gpu.temperature_c} °C</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </MetricCard>

            <MetricCard
              title="Diskler"
              icon={<HardDrive className="h-4 w-4" />}
              className="lg:col-span-2"
            >
              <div className="space-y-3">
                {data.disks.map((disk) => (
                  <div key={disk.mountpoint} className="rounded-lg border border-white/8 p-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-300">
                        {disk.mountpoint}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {disk.device} · {disk.fstype}
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span>
                        {disk.used_human} / {disk.total_human}
                      </span>
                      <span>%{disk.usage_percent}</span>
                    </div>
                    <UsageBar percent={disk.usage_percent} className="mt-1.5" />
                  </div>
                ))}
              </div>
            </MetricCard>

            <MetricCard
              title="Ağ"
              icon={<Network className="h-4 w-4" />}
              className="lg:col-span-2"
            >
              <div className="mb-3 rounded-lg bg-white/[0.03] px-3 py-2 text-[10px] text-slate-400">
                <p>
                  Toplam trafik — gönderilen:{" "}
                  <span className="text-slate-200">{data.network.total_io.bytes_sent_human}</span>
                  {" · "}
                  alınan:{" "}
                  <span className="text-slate-200">{data.network.total_io.bytes_recv_human}</span>
                </p>
                <p className="mt-0.5 text-slate-600">
                  Paket: ↑ {data.network.total_io.packets_sent.toLocaleString()} ↓{" "}
                  {data.network.total_io.packets_recv.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                {data.network.interfaces.map((iface) => (
                  <div
                    key={iface.name}
                    className="rounded-lg border border-white/8 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Server className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-mono text-[11px] font-medium text-slate-200">
                        {iface.name}
                      </span>
                      {iface.is_up != null && (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[9px] uppercase",
                            iface.is_up
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-slate-500/20 text-slate-500"
                          )}
                        >
                          {iface.is_up ? "aktif" : "kapalı"}
                        </span>
                      )}
                      {iface.speed_mbps != null && iface.speed_mbps > 0 && (
                        <span className="text-[9px] text-slate-600">{iface.speed_mbps} Mbps</span>
                      )}
                    </div>
                    {iface.addresses.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 font-mono text-[10px] text-violet-300/90">
                        {iface.addresses.map((addr) => (
                          <li key={`${addr.family}-${addr.address}`}>
                            {addr.family}: {addr.address}
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="mt-1 text-[9px] text-slate-600">
                      ↑ {iface.io.bytes_sent_human} · ↓ {iface.io.bytes_recv_human}
                    </p>
                  </div>
                ))}
              </div>
            </MetricCard>
          </div>
        )}

        {data?.collected_at && (
          <p className="mt-4 text-center text-[9px] text-slate-600">
            Son ölçüm: {new Date(data.collected_at).toLocaleString("tr-TR")}
          </p>
        )}
      </div>
    </div>
  );
}

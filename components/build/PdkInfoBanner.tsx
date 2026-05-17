"use client";

import { useEffect, useState } from "react";
import { Cpu, Loader2 } from "lucide-react";
import { fetchEdaRuntime } from "@/lib/job-client";
import type { EdaRuntimeInfo } from "@/lib/job-client";

export default function PdkInfoBanner() {
  const [info, setInfo] = useState<EdaRuntimeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchEdaRuntime()
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        PDK bilgisi yükleniyor…
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
        PDK bilgisi alınamadı: {error ?? "bilinmeyen hata"}
      </div>
    );
  }

  const { pdk } = info;
  const displayPath =
    pdk.host_path ??
    (pdk.source === "runner_image" ? `${pdk.container_path} (runner imajı)` : pdk.container_path);

  return (
    <div className="rounded-lg border border-sky-500/20 bg-sky-500/8 px-3 py-2.5">
      <div className="flex items-center gap-2 text-[11px] font-medium text-sky-200">
        <Cpu className="h-3.5 w-3.5 flex-shrink-0" />
        SkyWater 130 (sky130)
      </div>
      <p className="mt-1 break-all font-mono text-[10px] leading-relaxed text-slate-300">{displayPath}</p>
      <p className="mt-1 text-[10px] text-slate-500">{pdk.message}</p>
    </div>
  );
}

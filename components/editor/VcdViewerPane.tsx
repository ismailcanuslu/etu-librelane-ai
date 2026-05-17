"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { FileTab } from "@/lib/types";
import { FileAPI } from "@/lib/api";
import { formatFileSize } from "@/lib/download-workspace-file";
import VcdWaveformViewer from "@/components/viewer/VcdWaveformViewer";

const PREPARING_MESSAGE =
  "VCD dosyası sistem tarafından hazırlanıyor; bu işlem birkaç dakika sürebilir. " +
  "Lütfen bu pencereyi kapatmayın — üstteki sekmeler arasında geçiş yapabilirsiniz.";

interface VcdViewerPaneProps {
  tab: FileTab;
}

export default function VcdViewerPane({ tab }: VcdViewerPaneProps) {
  const [vcdText, setVcdText] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setVcdText(null);
    try {
      try {
        const meta = await FileAPI.getObjectMeta(tab.bucket, tab.key);
        setFileSize(meta.size);
      } catch {
        setFileSize(null);
      }
      const text = await FileAPI.getObjectText(tab.bucket, tab.key);
      setVcdText(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [tab.bucket, tab.key]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0d1117]">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-slate-300">{tab.key}</p>
          <p className="text-[10px] text-slate-500">
            VCD dalga formu
            {fileSize != null ? ` · ${formatFileSize(fileSize)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-rose-400/80" />
          <div className="max-w-md space-y-2">
            <p className="text-sm font-medium text-slate-300">VCD yükleniyor…</p>
            <p className="text-[11px] leading-relaxed text-slate-500">{PREPARING_MESSAGE}</p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-rose-400">
          {error}
        </div>
      )}

      {!loading && !error && vcdText && (
        <div className="flex-1 overflow-auto p-4">
          <VcdWaveformViewer vcdText={vcdText} />
        </div>
      )}
    </div>
  );
}

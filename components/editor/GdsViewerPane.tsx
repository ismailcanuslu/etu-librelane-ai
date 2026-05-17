"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTab } from "@/lib/types";
import GdsLayoutViewer from "@/components/viewer/GdsLayoutViewer";
import {
  fetchLayoutCapabilities,
  fetchLayoutPreviewBlob,
  type LayoutEngine,
} from "@/lib/layout-preview-api";

interface GdsViewerPaneProps {
  tab: FileTab;
}

export default function GdsViewerPane({ tab }: GdsViewerPaneProps) {
  const projectId = tab.bucket;
  const objectKey = tab.key;

  const [engine, setEngine] = useState<LayoutEngine>("klayout");
  const [gdsBuffer, setGdsBuffer] = useState<ArrayBuffer | null>(null);
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [klayoutAvailable, setKlayoutAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPngUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    try {
      const blob = await fetchLayoutPreviewBlob(projectId, objectKey, engine);
      if (engine === "browser") {
        setGdsBuffer(await blob.arrayBuffer());
      } else {
        setGdsBuffer(null);
        setPngUrl(URL.createObjectURL(blob));
      }
    } catch (e) {
      setGdsBuffer(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, objectKey, engine]);

  useEffect(() => {
    void fetchLayoutCapabilities()
      .then((caps) => {
        const k = caps.engines.find((e) => e.id === "klayout");
        setKlayoutAvailable(Boolean(k?.available));
      })
      .catch(() => setKlayoutAvailable(false));
  }, []);

  useEffect(() => {
    if (!klayoutAvailable && engine === "klayout") {
      setEngine("browser");
    }
  }, [klayoutAvailable, engine]);

  useEffect(() => {
    void load();
    return () => {
      if (pngUrl) URL.revokeObjectURL(pngUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- engine/tab değişiminde yenile
  }, [projectId, objectKey, engine]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0d1117]">
      <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/8 px-4 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-slate-300">{tab.key}</p>
          <p className="text-[10px] text-slate-500">GDS layout görüntüleyici</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex rounded-lg border border-white/10 p-0.5">
            {(
              [
                { id: "browser" as const, label: "Hızlı" },
                { id: "klayout" as const, label: "KLayout" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={opt.id === "klayout" && !klayoutAvailable}
                title={
                  opt.id === "klayout" && !klayoutAvailable
                    ? "KLayout imajda yok veya Docker erişilemiyor"
                    : undefined
                }
                onClick={() => setEngine(opt.id)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                  engine === opt.id
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-slate-200",
                  opt.id === "klayout" && !klayoutAvailable && "cursor-not-allowed opacity-40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/5"
            title="Yenile"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Layout yükleniyor…
          </div>
        )}
        {error && (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
            {error}
          </p>
        )}
        {!loading && !error && engine === "browser" && gdsBuffer && (
          <GdsLayoutViewer data={gdsBuffer} />
        )}
        {!loading && !error && engine === "klayout" && pngUrl && (
          <div className="space-y-2">
            <p className="text-[10px] text-slate-500">
              Backend (OpenLane imajı) içinde KLayout ile üretilen PNG — tam kontrol için dosyayı
              indirip masaüstü KLayout açabilirsiniz.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pngUrl}
              alt="KLayout önizleme"
              className="max-h-[min(70vh,640px)] w-full rounded-lg border border-white/10 object-contain bg-[#0a0f16]"
            />
          </div>
        )}
        <p className="mt-4 flex items-center gap-1 text-[10px] text-slate-600">
          <ExternalLink className="h-3 w-3" />
          Job çıktılarından GDS: OpenLane1 Flow tamamlanınca önizleme sekmesinde de görünür.
        </p>
      </div>
    </div>
  );
}

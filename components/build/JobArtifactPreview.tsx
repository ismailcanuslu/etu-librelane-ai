"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FileAPI } from "@/lib/api";
import { isGdsFile } from "@/lib/gds-file";
import { FLOW_LAYOUT_PNG_NAME } from "@/lib/layout-preview-api";
import { useActiveJob } from "@/lib/active-job-context";
import VcdWaveformViewer from "@/components/viewer/VcdWaveformViewer";
import GdsLayoutViewer from "@/components/viewer/GdsLayoutViewer";

export default function JobArtifactPreview({
  projectId,
  jobId,
  action,
}: {
  projectId: string;
  jobId: string;
  action: string;
}) {
  const { tabs } = useActiveJob();
  const jobTab = tabs.find((t) => t.jobId === jobId);
  const [vcdText, setVcdText] = useState<string | null>(null);
  const [gdsBuffer, setGdsBuffer] = useState<ArrayBuffer | null>(null);
  const [flowPngUrl, setFlowPngUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finished = Boolean(jobTab?.finishedAt && jobTab.status === "done");

  useEffect(() => {
    if (!finished || !jobTab?.artifactsPrefix) {
      setVcdText(null);
      setGdsBuffer(null);
      setFlowPngUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setFlowPngUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    void (async () => {
      try {
        const jobRoot = jobTab.artifactsPrefix!.replace(/\/artifacts\/?$/, "/");
        const [artifactObjects, jobRootObjects] = await Promise.all([
          FileAPI.listObjects(projectId, jobTab.artifactsPrefix!, true),
          FileAPI.listObjects(projectId, jobRoot, false),
        ]);
        const objects = [...jobRootObjects, ...artifactObjects];

        const vcdKey = objects.find((o) => o.key.toLowerCase().endsWith(".vcd"))?.key;
        const flowPngKey =
          action === "openlane1-flow"
            ? objects.find((o) => o.key.endsWith(FLOW_LAYOUT_PNG_NAME))?.key
            : undefined;
        const gdsKey = objects.find((o) => o.key.toLowerCase().endsWith(".gds"))?.key
          ?? objects.find((o) => o.key.toLowerCase().endsWith(".gdsii"))?.key;

        if (vcdKey && (action === "simulation" || action === "verification")) {
          const text = await FileAPI.getObjectText(projectId, vcdKey);
          if (!cancelled) setVcdText(text);
        } else if (action === "simulation") {
          const rootVcd = await FileAPI.listObjects(projectId, "", true);
          const localVcd = rootVcd.find((o) => o.key.toLowerCase().endsWith(".vcd"))?.key;
          if (localVcd) {
            const text = await FileAPI.getObjectText(projectId, localVcd);
            if (!cancelled) setVcdText(text);
          }
        }

        if (flowPngKey && !cancelled) {
          const blob = await FileAPI.getObjectBlob(projectId, flowPngKey);
          setFlowPngUrl(URL.createObjectURL(blob));
        } else if (gdsKey && (action === "openlane1-flow" || isGdsFile(gdsKey))) {
          const blob = await FileAPI.getObjectBlob(projectId, gdsKey);
          const buf = await blob.arrayBuffer();
          if (!cancelled) setGdsBuffer(buf);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [finished, jobTab?.artifactsPrefix, projectId, action, jobTab?.finishedAt, jobTab?.status]);

  if (!finished) return null;

  return (
    <section className="space-y-3 border-t border-white/10 pt-4">
      <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Görsel çıktılar
      </h3>
      {loading && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Artefaktlar yükleniyor…
        </div>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      {flowPngUrl && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500">
            OpenLane Flow tamamlandı — sunucuda KLayout ile üretilen PNG (2560×1440). GDS dosya
            ağacında <code className="text-slate-400">{FLOW_LAYOUT_PNG_NAME}</code> olarak da
            durur.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flowPngUrl}
            alt="KLayout layout önizleme (1440p)"
            className="max-h-[min(70vh,640px)] w-full rounded-lg border border-white/10 object-contain bg-[#0a0f16]"
          />
        </div>
      )}
      {vcdText && <VcdWaveformViewer vcdText={vcdText} />}
      {!flowPngUrl && gdsBuffer && (
        <GdsLayoutViewer data={gdsBuffer} />
      )}
      {!loading && !vcdText && !gdsBuffer && !flowPngUrl && (
        <p className="text-[11px] text-slate-600">
          Bu çalıştırma için tarayıcıda önizlenecek VCD/GDS/PNG bulunamadı. Log ve dosya ağacını
          kontrol edin.
        </p>
      )}
    </section>
  );
}

"use client";

import { useMemo } from "react";
import {
  Play,
  FolderOpen,
  FileInput,
  FileOutput,
  Terminal,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveJob } from "@/lib/active-job-context";
import type { ToolRunTabState } from "@/lib/types";
import JobArtifactPreview from "./JobArtifactPreview";

interface ToolRunPreviewEditorProps {
  toolRun: ToolRunTabState;
  onOpenFile?: (key: string) => void;
}

export default function ToolRunPreviewEditor({ toolRun, onOpenFile }: ToolRunPreviewEditorProps) {
  const { tabs } = useActiveJob();
  const { preview, jobId, projectId, action } = toolRun;

  const jobTab = useMemo(
    () => (jobId ? tabs.find((t) => t.jobId === jobId) : undefined),
    [tabs, jobId]
  );

  const statusLabel = !jobId
    ? "Önizleme"
    : jobTab?.finishedAt
      ? jobTab.status === "done"
        ? "Tamamlandı"
        : jobTab.status === "cancelled"
          ? "İptal"
          : "Hata"
      : "Çalışıyor";

  const StatusIcon =
    !jobId ? Play : jobTab?.status === "done" ? CheckCircle2 : jobTab?.finishedAt ? XCircle : Loader2;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-[#1e1e1e]">
      <div className="flex-shrink-0 border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn(
              "h-4 w-4 flex-shrink-0",
              jobTab?.status === "done" && "text-emerald-400",
              jobTab?.finishedAt && jobTab.status !== "done" && "text-rose-400",
              !jobTab?.finishedAt && jobId && "animate-spin text-amber-400",
              !jobId && "text-violet-400"
            )}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100">{preview.label}</p>
            <p className="text-[11px] text-slate-500">{statusLabel}</p>
          </div>
        </div>
        {preview.design_name && (
          <p className="mt-2 text-[11px] text-slate-400">
            OpenLane design: <span className="font-mono text-violet-300">{preview.design_name}</span>
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
        {preview.warnings.length > 0 && (
          <section className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              Uyarılar
            </p>
            <ul className="list-inside list-disc text-[11px] text-amber-100/90">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <FolderOpen className="h-3 w-3" />
            Çalışma dizinleri
          </h3>
          <dl className="space-y-2 text-[11px]">
            <div>
              <dt className="text-slate-600">Proje (workspace)</dt>
              <dd className="break-all font-mono text-slate-300">{preview.project_path}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Job workspace (geçici)</dt>
              <dd className="break-all font-mono text-slate-300">{preview.job_workspace_template}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Container içi</dt>
              <dd className="font-mono text-slate-300">{preview.container_workdir}</dd>
            </div>
            <div>
              <dt className="text-slate-600">Sky130 PDK</dt>
              <dd className="break-all font-mono text-sky-300">
                {preview.pdk.host_path ?? preview.pdk.container_path}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <FileInput className="h-3 w-3" />
            Okunan / kullanılan dosyalar
          </h3>
          {preview.input_files.length === 0 ? (
            <p className="text-[11px] text-slate-600">Eşleşen dosya yok.</p>
          ) : (
            <ul className="space-y-0.5">
              {preview.input_files.map((key) => (
                <li key={key}>
                  {onOpenFile ? (
                    <button
                      type="button"
                      onClick={() => onOpenFile(key)}
                      className="break-all text-left font-mono text-[11px] text-violet-300 hover:underline"
                    >
                      {key}
                    </button>
                  ) : (
                    <span className="break-all font-mono text-[11px] text-slate-300">{key}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <FileOutput className="h-3 w-3" />
            Beklenen çıktılar
          </h3>
          {preview.output_hints.length === 0 ? (
            <p className="text-[11px] text-slate-600">Ek çıktı dosyası tanımlı değil.</p>
          ) : (
            <ul className="list-inside list-disc font-mono text-[11px] text-slate-400">
              {preview.output_hints.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <Terminal className="h-3 w-3" />
            Komut
          </h3>
          <pre className="max-h-32 overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all rounded-lg border border-white/10 bg-[#0d1117] p-3 font-mono text-[10px] leading-relaxed text-slate-300">
            {preview.command_display}
          </pre>
          <p className="mt-1 text-[10px] text-slate-600">İmaj: {preview.image}</p>
        </section>

        {jobId && (
          <>
            <section className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-slate-500">Job ID</p>
              <p className="break-all font-mono text-[11px] text-slate-300">{jobId}</p>
              <p className="mt-1 text-[10px] text-slate-600">
                Canlı log için alttaki terminal sekmesine geçin.
              </p>
            </section>
            <JobArtifactPreview projectId={projectId} jobId={jobId} action={action} />
          </>
        )}
      </div>
    </div>
  );
}

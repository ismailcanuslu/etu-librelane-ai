"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
  X,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileAPI } from "@/lib/api";
import { useActiveJob } from "@/lib/active-job-context";
import { confirmAndStartToolRun } from "@/lib/run-tool-with-preview";
import type { ToolRunTabState } from "@/lib/types";
import JobArtifactPreview from "./JobArtifactPreview";

interface ToolRunPreviewEditorProps {
  toolRun: ToolRunTabState;
  onOpenFile?: (key: string) => void;
  onToolRunChange?: (patch: Partial<ToolRunTabState>) => void;
}

function defaultSelection(preview: ToolRunTabState["preview"]): string[] {
  return [...(preview.default_input_files ?? preview.input_files)];
}

export default function ToolRunPreviewEditor({
  toolRun,
  onOpenFile,
  onToolRunChange,
}: ToolRunPreviewEditorProps) {
  const { tabs, start } = useActiveJob();
  const { preview, jobId, projectId, action } = toolRun;

  const [selected, setSelected] = useState<string[]>(
    () => toolRun.selectedInputFiles ?? defaultSelection(preview)
  );
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [addQuery, setAddQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const jobTab = useMemo(
    () => (jobId ? tabs.find((t) => t.jobId === jobId) : undefined),
    [tabs, jobId]
  );

  const suggested = useMemo(
    () => new Set(preview.default_input_files ?? preview.input_files),
    [preview]
  );

  useEffect(() => {
    if (jobId) return;
    let cancelled = false;
    void FileAPI.listObjects(projectId, "", true).then((objects) => {
      if (cancelled) return;
      const keys = objects
        .map((o) => o.key)
        .filter((k) => k && !k.endsWith("/"))
        .sort();
      setProjectFiles(keys);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, jobId]);

  const updateSelected = useCallback(
    (next: string[]) => {
      const sorted = [...new Set(next)].sort();
      setSelected(sorted);
      onToolRunChange?.({ selectedInputFiles: sorted });
    },
    [onToolRunChange]
  );

  const toggleFile = (key: string) => {
    updateSelected(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  };

  const removeFile = (key: string) => {
    updateSelected(selected.filter((k) => k !== key));
  };

  const addCandidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    const inList = new Set(selected);
    return projectFiles
      .filter((k) => !inList.has(k))
      .filter((k) => !q || k.toLowerCase().includes(q))
      .slice(0, 40);
  }, [addQuery, projectFiles, selected]);

  const validationError = useMemo(() => {
    if (selected.length === 0) return "En az bir dosya seçin.";
    const hasV = selected.some((k) => k.endsWith(".v"));
    if (preview.warnings.some((w) => w.includes(".v")) && !hasV) {
      return "Bu araç için en az bir .v dosyası seçili olmalı.";
    }
    return null;
  }, [selected, preview.warnings]);

  async function handleStart() {
    if (validationError || jobId) return;
    setStartError(null);
    setStarting(true);
    try {
      await confirmAndStartToolRun(
        { ...toolRun, selectedInputFiles: selected },
        selected,
        start
      );
    } catch (e) {
      setStartError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }

  const statusLabel = !jobId
    ? "Onay bekleniyor"
    : jobTab?.finishedAt
      ? jobTab.status === "done"
        ? "Tamamlandı"
        : jobTab.status === "cancelled"
          ? "İptal"
          : "Hata"
      : "Çalışıyor";

  const StatusIcon =
    !jobId ? Play : jobTab?.status === "done" ? CheckCircle2 : jobTab?.finishedAt ? XCircle : Loader2;

  const locked = Boolean(jobId);

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
            <FileInput className="h-3 w-3" />
            Job workspace&apos;e kopyalanacak dosyalar
          </h3>
          <p className="mb-2 text-[10px] text-slate-600">
            Önerilen dosyalar işaretli gelir; ekleyip çıkarabilir, sonra çalıştırmayı onaylayabilirsiniz.
          </p>

          {locked ? (
            <ul className="space-y-0.5">
              {(toolRun.selectedInputFiles ?? selected).map((key) => (
                <li key={key} className="break-all font-mono text-[11px] text-slate-300">
                  {key}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <ul className="mb-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-[#0d1117]/60 p-2">
                {selected.length === 0 ? (
                  <li className="text-[11px] text-slate-600">Henüz dosya seçilmedi.</li>
                ) : (
                  selected.map((key) => (
                    <li
                      key={key}
                      className="flex items-start gap-2 rounded border border-white/5 bg-white/[0.03] px-2 py-1.5"
                    >
                      <input
                        type="checkbox"
                        checked
                        onChange={() => toggleFile(key)}
                        className="mt-0.5 rounded border-white/20"
                      />
                      <div className="min-w-0 flex-1">
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
                        {suggested.has(key) && (
                          <span className="ml-1 text-[9px] uppercase text-sky-400/80">önerilen</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(key)}
                        className="flex-shrink-0 rounded p-0.5 text-slate-500 hover:bg-white/10 hover:text-rose-300"
                        aria-label="Listeden çıkar"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))
                )}
              </ul>

              {!showAdd ? (
                <button
                  type="button"
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-white/15 px-2.5 py-1.5 text-[11px] text-slate-400 hover:border-violet-500/40 hover:text-violet-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Projeden dosya ekle
                </button>
              ) : (
                <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-2">
                  <div className="mb-2 flex items-center gap-2">
                    <Search className="h-3.5 w-3.5 text-slate-500" />
                    <input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="Dosya yolu ara…"
                      className="min-w-0 flex-1 bg-transparent text-[11px] text-slate-200 outline-none placeholder:text-slate-600"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdd(false);
                        setAddQuery("");
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-300"
                    >
                      Kapat
                    </button>
                  </div>
                  <ul className="max-h-36 space-y-0.5 overflow-y-auto">
                    {addCandidates.length === 0 ? (
                      <li className="text-[10px] text-slate-600">Eşleşen dosya yok.</li>
                    ) : (
                      addCandidates.map((key) => (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => {
                              updateSelected([...selected, key]);
                              setAddQuery("");
                            }}
                            className="w-full break-all rounded px-1.5 py-1 text-left font-mono text-[10px] text-slate-300 hover:bg-white/10"
                          >
                            + {key}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}

              {validationError && (
                <p className="mt-2 text-[11px] text-amber-400">{validationError}</p>
              )}
              {startError && <p className="mt-2 text-[11px] text-rose-400">{startError}</p>}
            </>
          )}
        </section>

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
          </dl>
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
        </section>

        {jobId && (
          <>
            <section className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-slate-500">Job ID</p>
              <p className="break-all font-mono text-[11px] text-slate-300">{jobId}</p>
            </section>
            <JobArtifactPreview projectId={projectId} jobId={jobId} action={action} />
          </>
        )}
      </div>

      {!locked && (
        <div className="flex-shrink-0 border-t border-white/8 bg-[#1a1f26] px-4 py-3">
          <button
            type="button"
            disabled={Boolean(validationError) || starting}
            onClick={() => void handleStart()}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
              validationError || starting
                ? "cursor-not-allowed bg-white/5 text-slate-600"
                : "bg-violet-600 text-white hover:bg-violet-500"
            )}
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Çalıştırmayı başlat ({selected.length} dosya)
          </button>
        </div>
      )}
    </div>
  );
}

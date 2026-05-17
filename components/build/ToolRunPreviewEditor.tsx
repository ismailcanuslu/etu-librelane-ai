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
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileAPI } from "@/lib/api";
import { useActiveJob } from "@/lib/active-job-context";
import { fetchRunPreview } from "@/lib/job-client";
import { confirmAndStartToolRun } from "@/lib/run-tool-with-preview";
import type { ToolRunTabState } from "@/lib/types";
import InputFileTreeView from "@/components/build/InputFileTreeView";
import OpenlaneFlowStagePicker from "@/components/build/OpenlaneFlowStagePicker";
import JobArtifactPreview from "./JobArtifactPreview";
import { keysFromWorkspaceAttachment } from "@/lib/input-file-tree";
import {
  readWorkspaceAttachment,
  WORKSPACE_ATTACHMENT_MIME,
} from "@/lib/workspace-drag";

interface ToolRunPreviewEditorProps {
  toolRun: ToolRunTabState;
  onOpenFile?: (key: string) => void;
  onToolRunChange?: (patch: Partial<ToolRunTabState>) => void;
}

function defaultSelection(preview: ToolRunTabState["preview"]): string[] {
  return [...(preview.default_input_files ?? preview.input_files)];
}

function defaultFlowSteps(preview: ToolRunTabState["preview"]): string[] {
  return [...(preview.default_flow_steps ?? preview.selected_flow_steps ?? [])];
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
  const [selectedFlowSteps, setSelectedFlowSteps] = useState<string[]>(
    () => toolRun.selectedFlowSteps ?? defaultFlowSteps(preview)
  );
  const [previewCommand, setPreviewCommand] = useState(preview.command_display);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [fileDragOver, setFileDragOver] = useState(false);

  const flowStages = preview.flow_stages ?? [];
  const flowDefaultIds = preview.default_flow_steps ?? [];
  const isOpenlaneFlow = action === "openlane1-flow" && flowStages.length > 0;

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

  const updateFlowSteps = useCallback(
    (next: string[]) => {
      const ordered = flowDefaultIds.filter((id) => next.includes(id));
      setSelectedFlowSteps(ordered);
      onToolRunChange?.({ selectedFlowSteps: ordered });
    },
    [flowDefaultIds, onToolRunChange]
  );

  useEffect(() => {
    if (!isOpenlaneFlow || jobId) return;
    let cancelled = false;
    void fetchRunPreview(projectId, action, { flowSteps: selectedFlowSteps }).then(
      (nextPreview) => {
        if (cancelled) return;
        setPreviewCommand(nextPreview.command_display);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [action, isOpenlaneFlow, jobId, projectId, selectedFlowSteps]);

  const toggleFile = (key: string) => {
    updateSelected(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    );
  };

  const removeFile = (key: string) => {
    updateSelected(selected.filter((k) => k !== key));
  };

  const addKeys = useCallback(
    (keys: string[]) => {
      if (keys.length === 0) return;
      updateSelected([...selected, ...keys]);
    },
    [selected, updateSelected]
  );

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setFileDragOver(false);
    const attachment = readWorkspaceAttachment(e.dataTransfer);
    if (!attachment) return;
    const keys = keysFromWorkspaceAttachment(attachment, projectId, projectFiles);
    addKeys(keys);
  }

  const addCandidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    const inList = new Set(selected);
    return projectFiles
      .filter((k) => !inList.has(k))
      .filter((k) => !q || k.toLowerCase().includes(q))
      .slice(0, 200);
  }, [addQuery, projectFiles, selected]);

  const validationError = useMemo(() => {
    if (selected.length === 0) return "En az bir dosya seçin.";
    if (isOpenlaneFlow && selectedFlowSteps.length === 0) {
      return "En az bir OpenLane aşaması seçin.";
    }
    const hasV = selected.some((k) => k.endsWith(".v"));
    if (preview.warnings.some((w) => w.includes(".v")) && !hasV) {
      return "Bu araç için en az bir .v dosyası seçili olmalı.";
    }
    return null;
  }, [isOpenlaneFlow, selected, selectedFlowSteps.length, preview.warnings]);

  async function handleStart() {
    if (validationError || jobId) return;
    setStartError(null);
    setStarting(true);
    try {
      await confirmAndStartToolRun(
        {
          ...toolRun,
          selectedInputFiles: selected,
          selectedFlowSteps: isOpenlaneFlow ? selectedFlowSteps : undefined,
        },
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
            Önerilen dosyalar işaretli gelir. Sol dosya ağacından sürükleyip buraya bırakabilir veya
            listeden ekleyip çıkarabilirsiniz.
          </p>

          {locked ? (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#0d1117]/60 p-2">
              <InputFileTreeView
                keys={toolRun.selectedInputFiles ?? selected}
                projectId={projectId}
                suggested={suggested}
                readonly
                onOpenFile={onOpenFile}
              />
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "mb-2 max-h-56 overflow-y-auto rounded-lg border bg-[#0d1117]/60 p-2 transition-colors",
                  fileDragOver
                    ? "border-violet-500/50 bg-violet-500/10 ring-1 ring-inset ring-violet-500/30"
                    : "border-dashed border-white/10"
                )}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes(WORKSPACE_ATTACHMENT_MIME)) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                  setFileDragOver(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setFileDragOver(false);
                  }
                }}
                onDrop={handleFileDrop}
              >
                {fileDragOver && (
                  <p className="mb-2 rounded border border-violet-500/30 bg-violet-500/15 px-2 py-1.5 text-center text-[10px] text-violet-200">
                    Bırakın — dosya veya klasör listeye eklenecek
                  </p>
                )}
                <InputFileTreeView
                  keys={selected}
                  projectId={projectId}
                  suggested={suggested}
                  onToggle={toggleFile}
                  onRemove={removeFile}
                  onOpenFile={onOpenFile}
                />
              </div>

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
                  <div className="max-h-48 overflow-y-auto rounded border border-white/10 bg-[#0d1117]/40 p-1">
                    <InputFileTreeView
                      keys={addCandidates}
                      projectId={projectId}
                      emptyLabel="Eşleşen dosya yok."
                      onAdd={(key) => {
                        addKeys([key]);
                        setAddQuery("");
                      }}
                    />
                  </div>
                </div>
              )}

              {validationError && (
                <p className="mt-2 text-[11px] text-amber-400">{validationError}</p>
              )}
              {startError && <p className="mt-2 text-[11px] text-rose-400">{startError}</p>}
            </>
          )}
        </section>

        {isOpenlaneFlow && (
          <OpenlaneFlowStagePicker
            stages={flowStages}
            defaultIds={flowDefaultIds}
            selected={selectedFlowSteps}
            onChange={updateFlowSteps}
            disabled={locked}
          />
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
            {isOpenlaneFlow && !jobId ? previewCommand : preview.command_display}
          </pre>
        </section>

        {jobId && (
          <>
            <section className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
              <p className="text-[10px] text-slate-500">Job ID</p>
              <p className="break-all font-mono text-[11px] text-slate-300">{jobId}</p>
            </section>
            <JobArtifactPreview
              projectId={projectId}
              jobId={jobId}
              action={action}
              onOpenFile={onOpenFile}
            />
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

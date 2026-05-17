"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, FileCode2, X } from "lucide-react";
import DiffViewer from "@/components/editor/DiffViewer";
import type { PendingFileChanges } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FileChangeApprovalPanelProps {
  pending: PendingFileChanges;
  onApprove: (paths: string[]) => void;
  onReject: () => void;
  busy?: boolean;
}

export default function FileChangeApprovalPanel({
  pending,
  onApprove,
  onReject,
  busy = false,
}: FileChangeApprovalPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const f of pending.files) init[f.path] = true;
    return init;
  });
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const f of pending.files) init[f.path] = true;
    return init;
  });

  const selectedPaths = pending.files.filter((f) => selected[f.path]).map((f) => f.path);

  function togglePath(path: string) {
    setSelected((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  return (
    <div className="flex-shrink-0 border-t border-violet-500/25 bg-violet-500/[0.08] px-3 py-2.5">
      <div className="mb-2 flex items-start gap-2">
        <FileCode2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-300" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-violet-100">Dosya değişiklikleri onay bekliyor</p>
          <p className="mt-0.5 text-[10px] text-violet-200/70">
            Kırmızı silinen, yeşil eklenen satırlar. Onaylamadan diske yazılmaz.
          </p>
        </div>
      </div>

      <div className="mb-2 max-h-[min(50vh,20rem)] space-y-1.5 overflow-y-auto">
        {pending.files.map((file) => {
          const isOpen = expanded[file.path] ?? false;
          return (
            <div key={file.path} className="rounded-lg border border-white/10 bg-[#0d1117]/80">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={selected[file.path] ?? false}
                  onChange={() => togglePath(file.path)}
                  className="h-3 w-3 rounded border-white/20 accent-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [file.path]: !isOpen }))}
                  className="flex min-w-0 flex-1 items-center gap-1 text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3 flex-shrink-0 text-slate-500" />
                  ) : (
                    <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-500" />
                  )}
                  <span className="truncate font-mono text-[11px] text-slate-200">{file.path}</span>
                  {file.isNew && (
                    <span className="flex-shrink-0 rounded bg-emerald-500/20 px-1 text-[9px] text-emerald-300">
                      yeni
                    </span>
                  )}
                </button>
              </div>
              {isOpen && (
                <div className="border-t border-white/8 px-2 py-2">
                  <DiffViewer oldText={file.oldContent} newText={file.newContent} maxHeightClass="max-h-48" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || selectedPaths.length === 0}
          onClick={() => onApprove(selectedPaths)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
            "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Seçilenleri uygula ({selectedPaths.length})
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
          )}
        >
          <X className="h-3.5 w-3.5" />
          Reddet
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/types";
import { buildTreeFromKeys } from "@/lib/input-file-tree";
import DownloadFileButton from "@/components/workspace/DownloadFileButton";

const EXT_COLORS: Record<string, string> = {
  v: "text-violet-400",
  sv: "text-violet-400",
  json: "text-amber-400",
  md: "text-sky-400",
  vcd: "text-rose-400",
  gds: "text-emerald-400",
};

function extColor(ext?: string) {
  return EXT_COLORS[ext ?? ""] ?? "text-slate-400";
}

interface TreeRowProps {
  node: FileNode;
  depth: number;
  projectId: string;
  suggested: Set<string>;
  readonly?: boolean;
  onToggle?: (key: string) => void;
  onRemove?: (key: string) => void;
  onOpenFile?: (key: string) => void;
  onAdd?: (key: string) => void;
}

function TreeRow({
  node,
  depth,
  projectId,
  suggested,
  readonly,
  onToggle,
  onRemove,
  onOpenFile,
  onAdd,
}: TreeRowProps) {
  const isDir = node.type === "dir";
  const [open, setOpen] = useState(depth < 2);

  if (isDir) {
    return (
      <div>
        <div
          className="flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs text-slate-400 hover:bg-white/5"
          style={{ paddingLeft: `${4 + depth * 12}px` }}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="w-3 flex-shrink-0">
            {open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
          {open ? (
            <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-400/90" />
          ) : (
            <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-400/90" />
          )}
          <span className="truncate font-medium">{node.name}</span>
        </div>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeRow
                key={child.key || child.name}
                node={child}
                depth={depth + 1}
                projectId={projectId}
                suggested={suggested}
                readonly={readonly}
                onToggle={onToggle}
                onRemove={onRemove}
                onOpenFile={onOpenFile}
                onAdd={onAdd}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-2 rounded border border-white/5 bg-white/[0.03] px-2 py-1",
        onAdd && "border-transparent bg-transparent hover:bg-white/5"
      )}
      style={{ marginLeft: `${4 + depth * 12}px` }}
    >
      {!readonly && onToggle && (
        <input
          type="checkbox"
          checked
          onChange={() => onToggle(node.key)}
          className="mt-0.5 rounded border-white/20"
        />
      )}
      <File className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", extColor(node.ext))} />
      <div className="min-w-0 flex-1">
        {onOpenFile && !onAdd ? (
          <button
            type="button"
            onClick={() => onOpenFile(node.key)}
            className="break-all text-left font-mono text-[11px] text-violet-300 hover:underline"
          >
            {node.name}
          </button>
        ) : onAdd ? (
          <button
            type="button"
            onClick={() => onAdd(node.key)}
            className="break-all text-left font-mono text-[11px] text-slate-300 hover:text-violet-300"
          >
            + {node.name}
          </button>
        ) : (
          <span className="break-all font-mono text-[11px] text-slate-300">{node.name}</span>
        )}
        {suggested.has(node.key) && (
          <span className="ml-1 text-[9px] uppercase text-sky-400/80">önerilen</span>
        )}
      </div>
      {!readonly && !onAdd && (
        <>
          <DownloadFileButton projectId={projectId} fileKey={node.key} fileName={node.name} />
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(node.key)}
              className="flex-shrink-0 rounded p-0.5 text-slate-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-rose-300 group-hover:opacity-100"
              aria-label="Listeden çıkar"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

interface InputFileTreeViewProps {
  keys: string[];
  projectId: string;
  suggested?: Set<string>;
  readonly?: boolean;
  emptyLabel?: string;
  onToggle?: (key: string) => void;
  onRemove?: (key: string) => void;
  onOpenFile?: (key: string) => void;
  /** Aday listesi: + ile ekleme */
  onAdd?: (key: string) => void;
}

export default function InputFileTreeView({
  keys,
  projectId,
  suggested = new Set(),
  readonly,
  emptyLabel = "Henüz dosya seçilmedi.",
  onToggle,
  onRemove,
  onOpenFile,
  onAdd,
}: InputFileTreeViewProps) {
  const tree = buildTreeFromKeys(keys);

  if (keys.length === 0) {
    return <p className="px-2 py-3 text-[11px] text-slate-600">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-0.5 py-1">
      {tree.map((node) => (
        <TreeRow
          key={node.key || node.name}
          node={node}
          depth={0}
          projectId={projectId}
          suggested={suggested}
          readonly={readonly}
          onToggle={onToggle}
          onRemove={onRemove}
          onOpenFile={onOpenFile}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}

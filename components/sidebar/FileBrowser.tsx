"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Upload,
  Pencil,
  Trash2,
  Loader2,
  FolderX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileNode } from "@/lib/types";
import { buildFileTree, isTextFile } from "@/lib/types";
import { FileAPI } from "@/lib/api";

export type { FileNode };

const EXT_COLORS: Record<string, string> = {
  v: "text-violet-400",
  sv: "text-violet-400",
  svh: "text-violet-400",
  vhd: "text-violet-400",
  json: "text-amber-400",
  log: "text-slate-400",
  txt: "text-slate-300",
  md: "text-sky-400",
  gds: "text-emerald-400",
  lef: "text-emerald-400",
  vcd: "text-rose-400",
  "": "text-slate-400",
};

function getExtColor(ext?: string) {
  return EXT_COLORS[ext ?? ""] ?? "text-slate-400";
}

// ─── Inline input (shared for new file/folder and rename) ────────────────────

interface InlineInputProps {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  placeholder?: string;
  colorClass?: string;
  hint?: string;
}

function InlineInput({ value, onChange, onCommit, onCancel, placeholder, colorClass, hint }: InlineInputProps) {
  return (
    <div className="px-2 mb-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className={cn(
          "w-full rounded border px-2 py-1 text-xs text-white placeholder-slate-600 outline-none",
          colorClass ?? "border-violet-500/40 bg-violet-500/10 focus:border-violet-400"
        )}
      />
      {hint && <p className="mt-0.5 text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}

// ─── FileRow ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  node: FileNode;
  depth: number;
  bucket: string;
  dragOverKey: string | null;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
  onOpenFile: (node: FileNode) => void;
  onNewFileIn: (prefix: string) => void;
  onDragStart: (node: FileNode) => void;
  onDragOver: (node: FileNode) => void;
  onDragLeave: () => void;
  onDrop: (targetDirKey: string) => void;
}

function FileRow({
  node, depth, dragOverKey,
  onRename, onDelete, onOpenFile, onNewFileIn,
  onDragStart, onDragOver, onDragLeave, onDrop,
}: FileRowProps) {
  const [open, setOpen] = useState(depth === 0);
  const isDir = node.type === "dir";
  const isDropTarget = isDir && dragOverKey === node.key;

  return (
    <div>
      <div
        draggable={!isDir}
        className={cn(
          "group flex items-center gap-1 rounded px-1 py-[3px] cursor-pointer select-none",
          "hover:bg-white/5 text-slate-300 text-xs",
          isDropTarget && "bg-violet-500/10 ring-1 ring-inset ring-violet-500/30"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => {
          if (isDir) setOpen((v) => !v);
          else if (isTextFile(node.ext)) onOpenFile(node);
        }}
        onDoubleClick={() => {
          if (!isDir) onOpenFile(node);
        }}
        onDragStart={(e) => {
          if (isDir) return;
          // setData is required by Chrome/Firefox for drag to activate
          e.dataTransfer.setData("text/plain", node.key);
          e.dataTransfer.effectAllowed = "move";
          onDragStart(node);
        }}
        onDragOver={(e) => {
          if (!isDir) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          onDragOver(node);
        }}
        onDragLeave={(e) => {
          if (!isDir) return;
          // Only clear highlight when leaving to outside this row, not when
          // entering a child element (icon, text span) inside the same row.
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            onDragLeave();
          }
        }}
        onDrop={(e) => {
          if (!isDir) return;
          e.preventDefault();
          e.stopPropagation();
          onDrop(node.key);
        }}
      >
        {/* Expand chevron */}
        <span className="w-3 flex-shrink-0">
          {isDir && (
            open
              ? <ChevronDown className="h-3 w-3 text-slate-500" />
              : <ChevronRight className="h-3 w-3 text-slate-500" />
          )}
        </span>

        {/* Icon */}
        {isDir ? (
          open
            ? <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
            : <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
        ) : (
          <File className={cn("h-3.5 w-3.5 flex-shrink-0", getExtColor(node.ext))} />
        )}

        <span className="flex-1 truncate">{node.name}</span>

        {/* Action buttons (hover) */}
        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
          {isDir && (
            <button
              onClick={(e) => { e.stopPropagation(); onNewFileIn(node.key); }}
              className="flex h-4 w-4 items-center justify-center rounded text-slate-600 hover:text-violet-400 transition-colors"
              title="Bu klasörde yeni dosya"
            >
              <FilePlus className="h-2.5 w-2.5" />
            </button>
          )}
          {!isDir && (
            <button
              onClick={(e) => { e.stopPropagation(); onRename(node); }}
              className="flex h-4 w-4 items-center justify-center rounded text-slate-600 hover:text-slate-300 transition-colors"
              title="Yeniden adlandır"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="flex h-4 w-4 items-center justify-center rounded text-slate-600 hover:text-red-400 transition-colors"
            title="Sil"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {isDir && open && node.children && (
        <div>
          {node.children.map((child) => (
            <FileRow
              key={child.key || child.name}
              node={child}
              depth={depth + 1}
              bucket=""
              dragOverKey={dragOverKey}
              onRename={onRename}
              onDelete={onDelete}
              onOpenFile={onOpenFile}
              onNewFileIn={onNewFileIn}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── FileBrowser ──────────────────────────────────────────────────────────────

interface FileBrowserProps {
  bucket: string;
  onOpenFile: (node: FileNode) => void;
}

export default function FileBrowser({ bucket, onOpenFile }: FileBrowserProps) {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // New file/folder
  const [newFilePrefix, setNewFilePrefix] = useState<string | null>(null); // null = closed, "" = root, "dir/" = subdir
  const [newFileName, setNewFileName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Rename
  const [renaming, setRenaming] = useState<FileNode | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Drag & drop (internal tree move)
  const [draggingNode, setDraggingNode] = useState<FileNode | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!bucket) { setTree([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const objects = await FileAPI.listObjects(bucket, "", true);
      setTree(buildFileTree(objects, ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [bucket]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Create file (root or in subfolder) ──

  async function handleCreateFile() {
    const name = newFileName.trim();
    if (!name || uploading) return;
    const prefix = newFilePrefix ?? "";
    setUploading(true);
    try {
      await FileAPI.putObject(bucket, `${prefix}${name}`, new Blob([""]), "text/plain");
      setNewFilePrefix(null);
      setNewFileName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  // ── Create folder ──

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name || uploading) return;
    setUploading(true);
    try {
      await FileAPI.putObject(bucket, `${name}/.gitkeep`, new Blob([""]), "text/plain");
      setShowNewFolder(false);
      setNewFolderName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  // ── Upload from disk ──

  async function handleUploadFiles(files: FileList | null, prefix = "") {
    if (!files || files.length === 0 || uploading) return;
    setUploading(true);
    setError(null);
    const arr = Array.from(files);
    try {
      for (let i = 0; i < arr.length; i++) {
        const file = arr[i];
        setUploadProgress(`${file.name} (${i + 1}/${arr.length})`);
        await FileAPI.putObject(
          bucket,
          `${prefix}${file.name}`,
          file,
          file.type || "application/octet-stream"
        );
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Delete ──

  async function handleDelete(node: FileNode) {
    try {
      if (node.type === "dir") {
        const objects = await FileAPI.listObjects(bucket, node.key, true);
        await Promise.all(objects.map((o) => FileAPI.deleteObject(bucket, o.key)));
      } else {
        await FileAPI.deleteObject(bucket, node.key);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // ── Rename ──

  async function handleRenameCommit() {
    if (!renaming || !renameValue.trim() || renaming.type === "dir") {
      setRenaming(null);
      return;
    }
    const newName = renameValue.trim();
    if (newName === renaming.name) { setRenaming(null); return; }

    const parentPrefix = renaming.key.substring(0, renaming.key.lastIndexOf("/") + 1);
    const newKey = `${parentPrefix}${newName}`;

    try {
      const blob = await FileAPI.getObjectBlob(bucket, renaming.key);
      await FileAPI.putObject(bucket, newKey, blob, blob.type || "application/octet-stream");
      await FileAPI.deleteObject(bucket, renaming.key);
      setRenaming(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRenaming(null);
    }
  }

  // ── Drag & drop MOVE ──

  async function handleDrop(targetDirKey: string) {
    const src = draggingNode;
    setDraggingNode(null);
    setDragOverKey(null);
    if (!src || src.type === "dir") return;

    const srcFileName = src.key.split("/").pop() ?? src.name;
    const newKey = `${targetDirKey}${srcFileName}`;
    if (newKey === src.key) return;

    try {
      const blob = await FileAPI.getObjectBlob(bucket, src.key);
      await FileAPI.putObject(bucket, newKey, blob, blob.type || "application/octet-stream");
      await FileAPI.deleteObject(bucket, src.key);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  // ── External drag & drop (from OS) ──

  function handleExternalDragOver(e: React.DragEvent) {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }

  function handleExternalDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleExternalDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    // Only handle OS file drops; internal tree moves use stopPropagation so they
    // never reach here, but double-check by looking for actual File objects.
    if (e.dataTransfer.files.length > 0) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 transition-colors",
        isDragOver && "bg-violet-500/5 ring-1 ring-inset ring-violet-500/20 rounded"
      )}
      onDragOver={handleExternalDragOver}
      onDragLeave={handleExternalDragLeave}
      onDrop={handleExternalDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] font-mono text-slate-600 truncate">{bucket}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Refresh */}
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-violet-400 transition-colors disabled:opacity-50"
            title="Yenile"
          >
            {loading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
          </button>
          {/* Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-violet-400 transition-colors disabled:opacity-50"
            title="Dosya yükle (diskten)"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          {/* New file (root) */}
          <button
            onClick={() => { setNewFilePrefix(""); setNewFileName(""); setShowNewFolder(false); }}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded transition-colors",
              newFilePrefix === ""
                ? "bg-violet-500/20 text-violet-400"
                : "text-slate-500 hover:bg-white/8 hover:text-violet-400"
            )}
            title="Yeni dosya (kök)"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          {/* New folder */}
          <button
            onClick={() => { setShowNewFolder((v) => !v); setNewFolderName(""); setNewFilePrefix(null); }}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded transition-colors",
              showNewFolder
                ? "bg-amber-500/20 text-amber-400"
                : "text-slate-500 hover:bg-white/8 hover:text-amber-400"
            )}
            title="Yeni klasör"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploadProgress && (
        <div className="mx-2 mb-1 flex items-center gap-1.5 rounded border border-violet-500/30 bg-violet-500/10 px-2 py-1.5 text-[10px] text-violet-400">
          <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
          <span className="truncate">Yükleniyor: {uploadProgress}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-2 mb-1 flex items-start justify-between gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[10px] text-rose-400">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="flex-shrink-0 underline">kapat</button>
        </div>
      )}

      {/* New file input (root or subfolder) */}
      {newFilePrefix !== null && (
        <InlineInput
          value={newFileName}
          onChange={setNewFileName}
          onCommit={handleCreateFile}
          onCancel={() => { setNewFilePrefix(null); setNewFileName(""); }}
          placeholder={newFilePrefix ? `${newFilePrefix}dosya_adi.v` : "dosya_adi.v"}
          hint="Enter → oluştur · Esc → iptal"
        />
      )}

      {/* New folder input */}
      {showNewFolder && (
        <InlineInput
          value={newFolderName}
          onChange={setNewFolderName}
          onCommit={handleCreateFolder}
          onCancel={() => { setShowNewFolder(false); setNewFolderName(""); }}
          placeholder="klasor_adi"
          colorClass="border-amber-500/40 bg-amber-500/10 focus:border-amber-400"
          hint="Enter → oluştur · Esc → iptal"
        />
      )}

      {/* Rename input */}
      {renaming && (
        <div className="px-2 mb-1">
          <p className="mb-0.5 text-[10px] text-slate-500 truncate">↩ {renaming.name}</p>
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameCommit();
              if (e.key === "Escape") setRenaming(null);
            }}
            className="w-full rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-white outline-none focus:border-amber-400"
          />
          <p className="mt-0.5 text-[10px] text-slate-600">Enter → kaydet · Esc → iptal</p>
        </div>
      )}

      {/* File tree */}
      <div className="overflow-y-auto">
        {loading && tree.length === 0 ? (
          <div className="flex items-center gap-1.5 px-3 py-4 text-xs text-slate-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Yükleniyor...</span>
          </div>
        ) : tree.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-5 text-slate-700">
            <FolderX className="h-6 w-6" />
            <span className="text-[10px]">Bucket boş</span>
            <span className="text-[10px] text-slate-700/70">Yükle, oluştur veya sürükle</span>
          </div>
        ) : (
          tree.map((node) => (
            <FileRow
              key={node.key || node.name}
              node={node}
              depth={0}
              bucket={bucket}
              dragOverKey={dragOverKey}
              onRename={(n) => { setRenaming(n); setRenameValue(n.name); }}
              onDelete={handleDelete}
              onOpenFile={onOpenFile}
              onNewFileIn={(prefix) => { setNewFilePrefix(prefix); setNewFileName(""); setShowNewFolder(false); }}
              onDragStart={(n) => setDraggingNode(n)}
              onDragOver={(n) => setDragOverKey(n.key)}
              onDragLeave={() => setDragOverKey(null)}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      {/* OS file drop hint */}
      {isDragOver && (
        <div className="mx-2 my-1 rounded border border-dashed border-violet-500/50 bg-violet-500/5 py-2 text-center text-[10px] text-violet-400">
          Bırakarak yükle
        </div>
      )}
    </div>
  );
}

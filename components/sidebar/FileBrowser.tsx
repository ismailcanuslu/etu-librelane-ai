"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FileNode } from "@/lib/mock-fs";

const EXT_COLORS: Record<string, string> = {
  v: "text-violet-400",
  sv: "text-violet-400",
  vhd: "text-violet-400",
  json: "text-amber-400",
  log: "text-slate-400",
  md: "text-sky-400",
  gds: "text-emerald-400",
  lef: "text-emerald-400",
  vcd: "text-rose-400",
  "": "text-slate-400",
};

function getExtColor(ext?: string) {
  return EXT_COLORS[ext ?? ""] ?? "text-slate-400";
}

interface FileRowProps {
  node: FileNode;
  depth: number;
  onRename: (node: FileNode) => void;
  onDelete: (node: FileNode) => void;
}

function FileRow({ node, depth, onRename, onDelete }: FileRowProps) {
  const [open, setOpen] = useState(depth === 0);
  const isDir = node.type === "dir";

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded px-1 py-[3px] cursor-pointer",
          "hover:bg-white/5 text-slate-300 text-xs"
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => isDir && setOpen((v) => !v)}
      >
        {/* Expand icon */}
        <span className="w-3 flex-shrink-0">
          {isDir &&
            (open ? (
              <ChevronDown className="h-3 w-3 text-slate-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-slate-500" />
            ))}
        </span>

        {/* Icon */}
        {isDir ? (
          open ? (
            <FolderOpen className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          ) : (
            <Folder className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          )
        ) : (
          <File className={cn("h-3.5 w-3.5 flex-shrink-0", getExtColor(node.ext))} />
        )}

        <span className="flex-1 truncate select-none">{node.name}</span>

        {/* Action buttons */}
        <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
          <button
            onClick={(e) => { e.stopPropagation(); onRename(node); }}
            className="flex h-4 w-4 items-center justify-center rounded text-slate-600 hover:text-slate-300 transition-colors"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}
            className="flex h-4 w-4 items-center justify-center rounded text-slate-600 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {isDir && open && node.children && (
        <div>
          {node.children.map((child) => (
            <FileRow
              key={child.name}
              node={child}
              depth={depth + 1}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileBrowserProps {
  nodes: FileNode[];
  projectPath: string;
}

export default function FileBrowser({ nodes, projectPath }: FileBrowserProps) {
  const [tree, setTree] = useState<FileNode[]>(nodes);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);

  function handleRename(node: FileNode) {
    setRenaming(node.name);
    setRenameValue(node.name);
  }

  function handleRenameCommit() {
    if (!renaming || !renameValue.trim()) { setRenaming(null); return; }
    function renameIn(nodes: FileNode[]): FileNode[] {
      return nodes.map((n) =>
        n.name === renaming
          ? { ...n, name: renameValue.trim() }
          : n.children
          ? { ...n, children: renameIn(n.children) }
          : n
      );
    }
    setTree(renameIn(tree));
    setRenaming(null);
  }

  function handleDelete(node: FileNode) {
    function deleteFrom(nodes: FileNode[]): FileNode[] {
      return nodes.filter((n) => n.name !== node.name).map((n) =>
        n.children ? { ...n, children: deleteFrom(n.children) } : n
      );
    }
    setTree(deleteFrom(tree));
  }

  function handleCreateFile() {
    if (!newFileName.trim()) return;
    const ext = newFileName.split(".").pop() ?? "";
    const newNode: FileNode = { name: newFileName.trim(), type: "file", ext };
    setTree([newNode, ...tree]);
    setNewFileName("");
    setShowNewFile(false);
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] font-mono text-slate-600 truncate">{projectPath}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setShowNewFile((v) => !v)}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-violet-400 transition-colors"
            title="Yeni dosya"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* New file input */}
      {showNewFile && (
        <div className="px-2 mb-1">
          <input
            autoFocus
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFile();
              if (e.key === "Escape") { setShowNewFile(false); setNewFileName(""); }
            }}
            placeholder="dosya_adi.v"
            className="w-full rounded border border-violet-500/40 bg-violet-500/10 px-2 py-1 text-xs text-white placeholder-slate-600 outline-none"
          />
        </div>
      )}

      {/* Rename overlay */}
      {renaming && (
        <div className="px-2 mb-1">
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameCommit();
              if (e.key === "Escape") setRenaming(null);
            }}
            className="w-full rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-white outline-none"
          />
        </div>
      )}

      {/* Tree */}
      <div className="overflow-y-auto">
        {tree.map((node) => (
          <FileRow
            key={node.name}
            node={node}
            depth={0}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}

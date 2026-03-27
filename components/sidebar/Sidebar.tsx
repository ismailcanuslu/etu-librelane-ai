"use client";

import { useState, useEffect, useRef } from "react";
import {
  FolderOpen,
  Plus,
  Settings2,
  ChevronRight,
  Cpu,
  Eye,
  EyeOff,
  Save,
  Trash2,
  ChevronDown,
  Files,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/SelectField";
import {
  getSettings,
  saveSettings,
  getProjects,
  saveProjects,
  getActiveProjectId,
  saveActiveProjectId,
  Settings,
} from "@/lib/store";
import type { Project, FileNode } from "@/lib/types";
import { toBucketName } from "@/lib/types";
import { BucketAPI } from "@/lib/api";
import FileBrowser from "./FileBrowser";

const AI_PROVIDERS = [
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { value: "claude-opus-4", label: "Claude Opus 4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "gemini-2-0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2-5-pro", label: "Gemini 2.5 Pro" },
];

interface SidebarProps {
  activeProjectId: string;
  onProjectChange: (id: string) => void;
  onOpenFile: (node: FileNode, bucket: string) => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = true, children, action }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-white/8">
      <div className="group flex w-full items-center justify-between gap-1 px-4 py-2.5 transition-colors hover:bg-white/3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span className="text-slate-500">{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 group-hover:text-slate-400">
            {title}
          </span>
        </button>
        <div className="flex flex-shrink-0 items-center gap-1">
          {action}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-600 transition-colors hover:bg-white/8"
          >
            <ChevronDown className={cn("h-3 w-3 transition-transform", open ? "rotate-0" : "-rotate-90")} />
          </button>
        </div>
      </div>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteDialogProps {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteDialog({ project, onConfirm, onCancel, deleting }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-xl border border-rose-500/30 bg-[#0d1117] p-5 shadow-2xl">
        <div className="mb-3 flex items-center gap-2 text-rose-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-semibold">Projeyi Sil</span>
        </div>
        <p className="mb-1 text-xs text-slate-300">
          <span className="font-medium text-white">{project.name}</span> projesi ve MinIO bucket&apos;ı{" "}
          <span className="font-medium text-rose-400">{project.bucket}</span> kalıcı olarak silinecek.
        </p>
        <p className="mb-4 text-xs text-slate-500">Tüm dosyalar geri alınamaz şekilde silinir.</p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50 transition-colors"
          >
            {deleting ? "Siliniyor..." : "Evet, Sil"}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

/** Format a bucket name as a human-readable display name. */
function bucketToDisplayName(bucket: string): string {
  return bucket
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function Sidebar({ activeProjectId, onProjectChange, onOpenFile }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [settings, setSettings] = useState<Settings>({ apiKey: "", aiProvider: "claude-sonnet-4-5" });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSettings(getSettings());
    loadProjectsFromMinIO();
  }, []);

  /**
   * Fetch real buckets from MinIO and merge with localStorage projects.
   * - Buckets in MinIO but not in localStorage → auto-add (display name from bucket slug)
   * - Projects in localStorage but bucket no longer in MinIO → remove
   * - When MinIO is unreachable → fallback to localStorage only
   */
  async function loadProjectsFromMinIO() {
    setLoadingProjects(true);
    try {
      const buckets = await BucketAPI.list();
      const stored = getProjects();
      const minioNames = new Set(buckets.map((b) => b.name));

      // Keep projects whose buckets still exist in MinIO
      const surviving = stored.filter((p) => minioNames.has(p.bucket));
      const survivingBuckets = new Set(surviving.map((p) => p.bucket));

      // Auto-add buckets that exist in MinIO but aren't in localStorage
      const newFromMinIO: Project[] = buckets
        .filter((b) => !survivingBuckets.has(b.name))
        .map((b) => ({
          id: `proj-${b.name}`,
          name: bucketToDisplayName(b.name),
          bucket: b.name,
          createdAt: b.createdAt,
        }));

      const merged = [...surviving, ...newFromMinIO];
      setProjects(merged);
      saveProjects(merged);

      // Fix active project if it no longer exists
      const currentId = getActiveProjectId();
      if (!merged.find((p) => p.id === currentId) && merged.length > 0) {
        onProjectChange(merged[0].id);
        saveActiveProjectId(merged[0].id);
      }
    } catch {
      // MinIO / Go service not reachable — fall back to localStorage
      const stored = getProjects();
      setProjects(stored);
    } finally {
      setLoadingProjects(false);
    }
  }

  useEffect(() => {
    if (showNewProject) inputRef.current?.focus();
  }, [showNewProject]);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  function handleSaveSettings() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name || creating) return;
    const bucket = toBucketName(name);
    setCreating(true);
    setCreateError(null);
    try {
      await BucketAPI.create(bucket);
      // Optimistically add to local list, then sync from MinIO
      const newProject: Project = {
        id: `proj-${Date.now()}`,
        name,
        bucket,
        createdAt: new Date().toISOString(),
      };
      const updated = [newProject, ...projects];
      setProjects(updated);
      saveProjects(updated);
      onProjectChange(newProject.id);
      saveActiveProjectId(newProject.id);
      setNewProjectName("");
      setShowNewProject(false);
      // Background sync to pick up any other buckets created externally
      loadProjectsFromMinIO();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await BucketAPI.remove(deleteTarget.bucket);
    } catch {
      // bucket might not exist yet — proceed with local removal
    }
    const updated = projects.filter((p) => p.id !== deleteTarget.id);
    setProjects(updated);
    saveProjects(updated);
    if (activeProjectId === deleteTarget.id) {
      const next = updated[0];
      onProjectChange(next?.id ?? "");
      saveActiveProjectId(next?.id ?? "");
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <>
      {deleteTarget && (
        <DeleteDialog
          project={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      <aside className="flex h-full w-64 flex-col border-r border-white/8 bg-[#0d1117] overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
            <Cpu className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">LibreLane</p>
            <p className="text-[10px] text-slate-500 mt-0.5">AI Design Agent</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Projects */}
          <CollapsibleSection
            title="Projeler"
            icon={<FolderOpen className="h-3.5 w-3.5" />}
            defaultOpen={true}
            action={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => loadProjectsFromMinIO()}
                  disabled={loadingProjects}
                  className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-slate-300 transition-colors disabled:opacity-40"
                  title="MinIO'dan yenile"
                >
                  {loadingProjects
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  }
                </button>
                <button
                  onClick={() => { setShowNewProject((v) => !v); setCreateError(null); }}
                  className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-violet-400 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            }
          >
            <div className="px-2 space-y-0.5">
              {showNewProject && (
                <div className="mb-2">
                  <input
                    ref={inputRef}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProject();
                      if (e.key === "Escape") { setShowNewProject(false); setNewProjectName(""); }
                    }}
                    placeholder="Proje adı..."
                    className="w-full rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-400"
                  />
                  {newProjectName.trim() && (
                    <p className="mt-0.5 text-[10px] text-slate-600">
                      bucket: <span className="text-slate-500">{toBucketName(newProjectName)}</span>
                    </p>
                  )}
                  {createError && (
                    <p className="mt-1 text-[10px] text-rose-400">{createError}</p>
                  )}
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={handleCreateProject}
                      disabled={creating}
                      className="flex-1 rounded-md bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-500 disabled:opacity-50"
                    >
                      {creating ? "Oluşturuluyor..." : "Oluştur"}
                    </button>
                    <button
                      onClick={() => { setShowNewProject(false); setNewProjectName(""); setCreateError(null); }}
                      className="flex-1 rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400 hover:bg-white/10"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              )}

              {loadingProjects && projects.length === 0 && (
                <div className="flex items-center gap-1.5 px-2 py-3 text-[11px] text-slate-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Bucket'lar yükleniyor...</span>
                </div>
              )}

              {!loadingProjects && projects.length === 0 && !showNewProject && (
                <p className="px-2 py-3 text-center text-[11px] text-slate-600">
                  Henüz proje yok. + ile ekle.
                </p>
              )}

              {projects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-all",
                    activeProjectId === project.id
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  )}
                  onClick={() => { onProjectChange(project.id); saveActiveProjectId(project.id); }}
                >
                  <FolderOpen className={cn("h-4 w-4 flex-shrink-0", activeProjectId === project.id ? "text-violet-400" : "text-slate-500")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{project.name}</p>
                    <p className="text-[10px] text-slate-600 truncate">{project.bucket}</p>
                  </div>
                  {activeProjectId === project.id && <ChevronRight className="h-3 w-3 text-violet-400 flex-shrink-0" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}
                    className={cn(
                      "h-5 w-5 items-center justify-center rounded text-slate-600 hover:text-red-400 transition-colors flex-shrink-0",
                      activeProjectId === project.id ? "flex" : "hidden group-hover:flex"
                    )}
                    title="Projeyi sil"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          {/* File Explorer */}
          {activeProject && (
            <CollapsibleSection
              title="Dosya Gezgini"
              icon={<Files className="h-3.5 w-3.5" />}
              defaultOpen={true}
            >
              <FileBrowser
                bucket={activeProject.bucket}
                onOpenFile={(node) => onOpenFile(node, activeProject.bucket)}
              />
            </CollapsibleSection>
          )}

          {/* Settings */}
          <CollapsibleSection
            title="Ayarlar"
            icon={<Settings2 className="h-3.5 w-3.5" />}
            defaultOpen={false}
          >
            <div className="px-4 space-y-3 pt-1">
              <div>
                <label className="mb-1.5 block text-[11px] text-slate-500">AI Sağlayıcı</label>
                <Select
                  value={settings.aiProvider}
                  onValueChange={(v) => setSettings((s) => ({ ...s, aiProvider: v }))}
                  options={AI_PROVIDERS}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-slate-500">API Anahtarı</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? "text" : "password"}
                      value={settings.apiKey}
                      onChange={(e) => setSettings((s) => ({ ...s, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-8 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-violet-500/60 transition-all"
                    />
                    <button
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    className={cn(
                      "flex items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-all",
                      saved
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-violet-600 text-white hover:bg-violet-500"
                    )}
                  >
                    {saved ? "✓" : <Save className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </aside>
    </>
  );
}

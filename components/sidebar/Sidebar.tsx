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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/SelectField";
import {
  getSettings,
  saveSettings,
  getProjects,
  saveProjects,
  saveActiveProjectId,
  Settings,
} from "@/lib/store";
import { Project, MOCK_PROJECTS } from "@/lib/mock-data";
import { MOCK_FILE_TREE } from "@/lib/mock-fs";
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
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-white/3 transition-colors group"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 group-hover:text-slate-400">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {action && <span onClick={(e) => e.stopPropagation()}>{action}</span>}
          <ChevronDown
            className={cn("h-3 w-3 text-slate-600 transition-transform", open ? "rotate-0" : "-rotate-90")}
          />
        </div>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}

export default function Sidebar({ activeProjectId, onProjectChange }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<Settings>({ apiKey: "", aiProvider: "claude-sonnet-4-5" });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProjects(getProjects());
    setSettings(getSettings());
  }, []);

  useEffect(() => {
    if (showNewProject) inputRef.current?.focus();
  }, [showNewProject]);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const fileTree = MOCK_FILE_TREE[activeProjectId] ?? [];

  function handleSaveSettings() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name,
      path: `~/projects/${name}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newProject, ...projects];
    setProjects(updated);
    saveProjects(updated);
    onProjectChange(newProject.id);
    saveActiveProjectId(newProject.id);
    setNewProjectName("");
    setShowNewProject(false);
  }

  function handleDeleteProject(id: string) {
    const updated = projects.filter((p) => p.id !== id);
    setProjects(updated);
    saveProjects(updated);
    if (activeProjectId === id && updated[0]) {
      onProjectChange(updated[0].id);
      saveActiveProjectId(updated[0].id);
    }
  }

  return (
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
        {/* Projects section */}
        <CollapsibleSection
          title="Projeler"
          icon={<FolderOpen className="h-3.5 w-3.5" />}
          defaultOpen={true}
          action={
            <button
              onClick={() => setShowNewProject((v) => !v)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-white/8 hover:text-violet-400 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
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
                    if (e.key === "Escape") setShowNewProject(false);
                  }}
                  placeholder="Proje adı..."
                  className="w-full rounded-lg border border-violet-500/50 bg-violet-500/10 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-violet-400"
                />
                <div className="mt-1 flex gap-1">
                  <button onClick={handleCreateProject} className="flex-1 rounded-md bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-500">Oluştur</button>
                  <button onClick={() => { setShowNewProject(false); setNewProjectName(""); }} className="flex-1 rounded-md bg-white/5 px-2 py-1 text-xs text-slate-400 hover:bg-white/10">İptal</button>
                </div>
              </div>
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
                <span className="flex-1 text-sm truncate font-medium">{project.name}</span>
                {activeProjectId === project.id && <ChevronRight className="h-3 w-3 text-violet-400 flex-shrink-0" />}
                {activeProjectId !== project.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                    className="hidden group-hover:flex h-5 w-5 items-center justify-center rounded text-slate-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
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
            <FileBrowser nodes={fileTree} projectPath={activeProject.path} />
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
  );
}

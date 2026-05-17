// ─── Domain types (mirroring Go structs) ────────────────────────────────────

export interface ObjectInfo {
  key: string;
  size: number;
  etag: string;
  lastModified: string; // ISO string from JSON
  contentType?: string;
}

export interface ListObjectsResponse {
  project: string;
  prefix: string;
  recursive: boolean;
  count: number;
  objects: ObjectInfo[];
}

export interface ProjectSummary {
  name: string;
  createdAt: string;
}

// ─── File tree (derived from ObjectInfo[]) ───────────────────────────────────

export interface FileNode {
  name: string;
  type: "file" | "dir";
  /** File: full object key. Directory: prefix ending with `/`. */
  key: string;
  children?: FileNode[];
  ext?: string;
}

// ─── Project / Chat ──────────────────────────────────────────────────────────

export type Role = "user" | "assistant";

/** Sohbet modu: agent = doğrudan yardım, plan = adım adım plan üret */
export type ChatMode = "agent" | "plan";

export interface ChatAttachmentRef {
  key: string;
  name: string;
  type: "file" | "dir";
  /** Dosya editöründen seçilen satır aralığı (1 tabanlı, dahil). */
  lineStart?: number;
  lineEnd?: number;
  /** Seçilen metin; gönderimde öncelikli kullanılır. */
  snippet?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
  attachments?: ChatAttachmentRef[];
  /** Ollama / bazı modellerin iç düşünce metni (UI’da daraltılabilir blok). */
  thinking?: string;
}

/** Plan modu yanıtı diske yazıldıktan sonra onay bekleyen kayıt. */
export interface PendingPlan {
  messageId: string;
  planKey: string;
  planName: string;
  createdAt: string;
}

/** AI önerisi — henüz diske yazılmamış tek dosya değişikliği. */
export interface ProposedFileChange {
  path: string;
  oldContent: string;
  newContent: string;
  isNew: boolean;
}

/** Agent yanıtındaki dosya blokları için diff onayı. */
export interface PendingFileChanges {
  messageId: string;
  files: ProposedFileChange[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  /** Workspace project slug (sanitized). Each project maps to one folder. */
  bucket: string;
  createdAt: string;
}

// ─── Editor ──────────────────────────────────────────────────────────────────

export const OLLAMA_SETTINGS_TAB_KEY = "__ollama_settings__";

/** Her çalıştırma için benzersiz sekme (aynı araç tekrar çalışınca yeni sekme). */
export function toolRunTabKey(action: string, runId: string): string {
  return `__tool_run__:${action}:${runId}`;
}

export function autonomWorkshopTabKey(configKey: string, runId: string): string {
  return `__atolye__:${encodeURIComponent(configKey)}:${runId}`;
}

export type EditorTabKind =
  | "file"
  | "ollama-settings"
  | "tool-run"
  | "autonom-workshop"
  | "gds-viewer"
  | "vcd-viewer";

export type AutonomParamKind = "scalar" | "dimension_pair" | "die_area_rect";

export interface AutonomParamSpec {
  flag: string;
  kind: AutonomParamKind;
  start: number | number[] | string;
  target: number | number[] | string;
  step: number | number[] | string;
  serialize_as?: string;
}

export interface AutonomCampaignSpec {
  param: AutonomParamSpec;
  build_actions: string[];
  openlane_flow_steps?: string[];
  input_files: string[];
}

export type AutonomCampaignStatus =
  | "queued"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export interface AutonomCampaignPreview {
  project_id: string;
  config_key: string;
  iteration_count: number;
  iterations: Array<{ index: number; param_label: string; param_value: unknown }>;
  input_files: string[];
  build_actions: string[];
  openlane_flow_steps?: string[];
  param: AutonomParamSpec;
}

export interface AutonomWorkshopTabState {
  projectId: string;
  configKey: string;
  runId: string;
  step: 1 | 2;
  spec: AutonomCampaignSpec;
  campaignId?: string;
  preview?: AutonomCampaignPreview;
}

export interface PdkRuntimeInfo {
  pdk_family: string;
  source: "host_mount" | "runner_image";
  host_path: string | null;
  container_path: string;
  available: boolean;
  message: string;
}

export interface FlowStageOption {
  id: string;
  label: string;
  label_en?: string;
  description?: string;
}

export interface RunPreview {
  action: string;
  label: string;
  description: string;
  project_id: string;
  design_name: string | null;
  image: string;
  command: string[];
  command_display: string;
  workspace_root: string;
  project_path: string;
  job_workspace_template: string;
  container_workdir: string;
  pdk: PdkRuntimeInfo;
  input_files: string[];
  /** Önizleme anında önerilen varsayılan seçim */
  default_input_files?: string[];
  output_hints: string[];
  warnings: string[];
  requires_pdk: boolean;
  /** openlane1-flow: seçilebilir makro aşamalar */
  flow_stages?: FlowStageOption[];
  default_flow_steps?: string[];
  selected_flow_steps?: string[];
  flow_stage_count?: number;
}

export interface ToolRunTabState {
  projectId: string;
  action: string;
  runId: string;
  preview: RunPreview;
  jobId?: string;
  /** Kullanıcının onayladığı / düzenlediği workspace dosya listesi */
  selectedInputFiles?: string[];
  /** openlane1-flow: çalıştırılacak makro aşamalar (sıralı id listesi) */
  selectedFlowSteps?: string[];
}

export interface FileTab {
  /** Dosya dışı sekmeler (ör. Ollama ayarları, araç çalıştırma önizlemesi). */
  kind?: EditorTabKind;
  key: string;
  bucket: string;
  name: string;
  content: string;
  dirty: boolean;
  toolRun?: ToolRunTabState;
  autonomWorkshop?: AutonomWorkshopTabState;
}

// ─── Job runner ──────────────────────────────────────────────────────────────

export type JobStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface ToolSpec {
  id: string;
  label: string;
  description: string;
  image: string;
  group: string;
  badge: string | null;
  enabled: boolean;
  kind?: "binary" | "probe" | "flow";
  requires_verilog?: boolean;
  requires_config?: boolean;
  requires_pdk?: boolean;
}

export interface Job {
  id: string;
  project_id: string;
  action: string;
  image: string;
  command: string;
  status: JobStatus;
  exit_code: number | null;
  log_object_key: string | null;
  artifacts_prefix: string | null;
  error_message: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export type JobEventType = "snapshot" | "status" | "line" | "done" | "error";

export interface JobLineEvent {
  stream: "stdout" | "stderr" | "system";
  line: string;
  ts: string;
}

export interface JobStatusEvent {
  status: JobStatus | "preparing";
  message?: string;
  container_id?: string;
}

export interface JobDoneEvent {
  status: JobStatus;
  exit_code: number | null;
  log_object_key: string | null;
  artifacts_prefix: string | null;
}

export interface JobErrorEvent {
  message: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert an arbitrary project name to a valid workspace project slug.
 * Rules: lowercase letters, digits, hyphens; 3-63 chars; no leading/trailing hyphens.
 */
export function toBucketName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  // Ensure minimum length of 3
  return slug.length >= 3 ? slug : (slug + "---").slice(0, 3);
}

/** Text-editable file extensions (open on double-click). */
export const TEXT_EXTENSIONS = new Set([
  "txt", "log", "v", "sv", "svh", "vhd", "vhdl",
  "json", "md", "yaml", "yml", "toml", "ini", "cfg",
  "tcl", "py", "sh", "makefile", "mk", "sdc", "xdc",
  "lef", "def", "spef", "sdf", "lib",
]);

export function isTextFile(ext?: string): boolean {
  if (!ext) return false;
  return TEXT_EXTENSIONS.has(ext.toLowerCase());
}

export { isGdsFile, gdsViewerTabKey } from "@/lib/gds-file";
export { isVcdFile } from "@/lib/vcd-file";

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);

export { isOpenlaneConfigFile } from "@/lib/openlane-config-io";

export function isMarkdownFile(nameOrKey: string, ext?: string): boolean {
  const e = (ext ?? nameOrKey.split(".").pop() ?? "").toLowerCase();
  if (MARKDOWN_EXTENSIONS.has(e)) return true;
  return nameOrKey.toLowerCase().endsWith(".md") || nameOrKey.toLowerCase().endsWith(".markdown");
}

/**
 * Convert a flat list of ObjectInfo into a nested FileNode tree.
 * Pass prefix="" when each project has its own folder (no prefix stripping needed).
 */
export function buildFileTree(objects: ObjectInfo[], prefix: string): FileNode[] {
  const root: FileNode[] = [];

  for (const obj of objects) {
    const relativePath = prefix ? obj.key.slice(prefix.length) : obj.key;
    if (!relativePath) continue;

    const parts = relativePath.split("/").filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      let existing = current.find((n) => n.name === part);
      if (!existing) {
        const ext = isLast ? (part.includes(".") ? part.split(".").pop() : "") : undefined;
        const dirPrefix = `${prefix}${parts.slice(0, i + 1).join("/")}/`;
        existing = {
          name: part,
          type: isLast ? "file" : "dir",
          key: isLast ? obj.key : dirPrefix,
          ext,
          children: isLast ? undefined : [],
        };
        current.push(existing);
      } else if (!isLast && existing.type === "dir" && !existing.key) {
        existing.key = `${prefix}${parts.slice(0, i + 1).join("/")}/`;
      }
      if (!isLast) {
        current = existing.children!;
      }
    }
  }

  return root;
}

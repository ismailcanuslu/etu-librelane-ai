// ─── Domain types (mirroring Go structs) ────────────────────────────────────

export interface ObjectInfo {
  key: string;
  size: number;
  etag: string;
  lastModified: string; // ISO string from JSON
  contentType?: string;
}

export interface ListObjectsResponse {
  bucket: string;
  prefix: string;
  recursive: boolean;
  count: number;
  objects: ObjectInfo[];
}

export interface PresignResponse {
  bucket: string;
  key: string;
  expiresIn: string;
  presignedGet: string;
  recommendedUse: string;
}

export interface BucketInfo {
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

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

export interface Project {
  id: string;
  name: string;
  /** MinIO bucket name (sanitized). Each project maps to one bucket. */
  bucket: string;
  createdAt: string;
}

// ─── Editor ──────────────────────────────────────────────────────────────────

export interface FileTab {
  key: string;
  bucket: string;
  name: string;
  content: string;
  dirty: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert an arbitrary project name to a valid MinIO/S3 bucket name.
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

/**
 * Convert a flat list of ObjectInfo (MinIO) into a nested FileNode tree.
 * Pass prefix="" when each project has its own bucket (no prefix stripping needed).
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

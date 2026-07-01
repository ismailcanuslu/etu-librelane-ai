/**
 * FileAPI — Next.js BFF `/api/files` üzerinden yerel dosya API'sine konuşur.
 * Yalnızca Client Components / tarayıcı kodunda kullanın.
 */

import type { ListObjectsResponse, ObjectInfo, ProjectSummary } from "./types";

const FILES_BASE = "/api/files";

async function throwIfError(res: Response): Promise<Response> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res;
}

export const FileAPI = {
  async listProjects(): Promise<ProjectSummary[]> {
    const res = await throwIfError(await fetch(FILES_BASE));
    const data = await res.json() as { projects: ProjectSummary[] };
    return data.projects ?? [];
  },

  async createProject(name: string, template: "caravel" | "verilog" = "caravel"): Promise<void> {
    await throwIfError(
      await fetch(FILES_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, template }),
      })
    );
  },

  async deleteProject(projectId: string): Promise<void> {
    await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(projectId)}`, { method: "DELETE" })
    );
  },

  async listObjects(projectId: string, prefix = "", recursive = true): Promise<ObjectInfo[]> {
    const params = new URLSearchParams({ prefix, recursive: String(recursive) });
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(projectId)}?${params}`)
    );
    const data: ListObjectsResponse = await res.json();
    return data.objects ?? [];
  },

  async putObject(projectId: string, key: string, body: BodyInit, contentType?: string): Promise<ObjectInfo> {
    const params = new URLSearchParams({ key });
    const headers: Record<string, string> = {};
    if (contentType) headers["x-content-type"] = contentType;
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(projectId)}/upload?${params}`, {
        method: "POST",
        headers,
        body,
      })
    );
    return res.json();
  },

  async deleteObject(projectId: string, key: string): Promise<void> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(projectId)}/${segments}`, { method: "DELETE" })
    );
  },

  async getObjectMeta(projectId: string, key: string): Promise<ObjectInfo> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(projectId)}/meta/${segments}`)
    );
    return res.json();
  },

  async getObjectText(projectId: string, key: string): Promise<string> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(projectId)}/${segments}`)
    );
    return res.text();
  },

  async getObjectBlob(projectId: string, key: string): Promise<Blob> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(projectId)}/${segments}`)
    );
    return res.blob();
  },
};

/**
 * FileAPI / BucketAPI — calls Next.js BFF API routes which proxy to the Go file service.
 * Used only in Client Components / browser code.
 */

import type { BucketInfo, ListObjectsResponse, ObjectInfo, PresignResponse } from "./types";

const FILES_BASE = "/api/files";
const BUCKETS_BASE = "/api/buckets";

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

// ─── Bucket operations ───────────────────────────────────────────────────────

export const BucketAPI = {
  async list(): Promise<BucketInfo[]> {
    const res = await throwIfError(await fetch(BUCKETS_BASE));
    const data = await res.json() as { buckets: BucketInfo[] };
    return data.buckets ?? [];
  },

  async create(name: string): Promise<void> {
    await throwIfError(
      await fetch(BUCKETS_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    );
  },

  async remove(name: string): Promise<void> {
    await throwIfError(
      await fetch(`${BUCKETS_BASE}/${encodeURIComponent(name)}`, { method: "DELETE" })
    );
  },
};

// ─── File operations ─────────────────────────────────────────────────────────

export const FileAPI = {
  /** List all objects under an optional prefix within a bucket */
  async listObjects(bucket: string, prefix = "", recursive = true): Promise<ObjectInfo[]> {
    const params = new URLSearchParams({ prefix, recursive: String(recursive) });
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(bucket)}?${params}`)
    );
    const data: ListObjectsResponse = await res.json();
    return data.objects ?? [];
  },

  /** Upload a file to a specific key in a bucket */
  async putObject(bucket: string, key: string, body: BodyInit, contentType?: string): Promise<ObjectInfo> {
    const params = new URLSearchParams({ key });
    const headers: Record<string, string> = {};
    if (contentType) headers["x-content-type"] = contentType;
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(bucket)}/upload?${params}`, {
        method: "POST",
        headers,
        body,
      })
    );
    return res.json();
  },

  /** Delete an object by key */
  async deleteObject(bucket: string, key: string): Promise<void> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(bucket)}/${segments}`, { method: "DELETE" })
    );
  },

  /** Get object metadata */
  async getObjectMeta(bucket: string, key: string): Promise<ObjectInfo> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(bucket)}/meta/${segments}`)
    );
    return res.json();
  },

  /** Get raw text content of an object */
  async getObjectText(bucket: string, key: string): Promise<string> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(bucket)}/${segments}`)
    );
    return res.text();
  },

  /** Get raw binary content as Blob — preserves all bytes (use for rename/copy) */
  async getObjectBlob(bucket: string, key: string): Promise<Blob> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    const res = await throwIfError(
      await fetch(`${FILES_BASE}/${encodeURIComponent(bucket)}/${segments}`)
    );
    return res.blob();
  },

  /** Get a presigned download URL for an object */
  async presignObject(bucket: string, key: string, expiryMinutes = 15): Promise<string> {
    const segments = key.split("/").map(encodeURIComponent).join("/");
    const params = new URLSearchParams({ expiryMinutes: String(expiryMinutes) });
    const res = await throwIfError(
      await fetch(
        `${FILES_BASE}/${encodeURIComponent(bucket)}/presign/${segments}?${params}`,
        { method: "POST" }
      )
    );
    const data: PresignResponse = await res.json();
    return data.presignedGet;
  },
};

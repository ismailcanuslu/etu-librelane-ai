/**
 * Go file microservice tabanı (veya gateway: aynı path’ler /buckets/... ile gider).
 * `MINIO_BACKEND` — `.env` / `.env.local` (örn. doğrudan servis :8080 veya gateway :8000).
 */
export const FILE_SERVICE_BASE =
  process.env.MINIO_BACKEND?.replace(/\/$/, "") ?? "http://localhost:8000";

/** Encode each path segment for upstream paths (keys may contain spaces, unicode, etc.) */
export function encodeObjectKeyPath(key: string): string {
  return key
    .split("/")
    .filter((s) => s.length > 0)
    .map(encodeURIComponent)
    .join("/");
}

export function upstreamObjectsPath(bucket: string, key: string): string {
  return `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(bucket)}/objects/${encodeObjectKeyPath(key)}`;
}

export function upstreamObjectsMetaPath(bucket: string, key: string): string {
  return `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(bucket)}/meta/${encodeObjectKeyPath(key)}`;
}

export function upstreamPresignPath(bucket: string, key: string): string {
  return `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(bucket)}/presign/${encodeObjectKeyPath(key)}`;
}

export function upstreamBucketPath(bucket: string): string {
  return `${FILE_SERVICE_BASE}/buckets/${encodeURIComponent(bucket)}`;
}

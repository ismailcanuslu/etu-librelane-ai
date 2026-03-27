/**
 * Go file microservice base URL (MinIO proxy).
 * `MINIO_BACKEND` (.env / .env.local), e.g. http://localhost:8080
 */
export const FILE_SERVICE_BASE =
  process.env.MINIO_BACKEND?.replace(/\/$/, "") ?? "http://localhost:8080";

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

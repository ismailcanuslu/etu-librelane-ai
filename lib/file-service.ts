/**
 * Gateway veya doğrudan backend tabanı.
 * `WORKSPACE_BACKEND` / `MINIO_BACKEND` yalnızca sunucuda (Route Handlers) okunur.
 */
export function getFileServiceBase(): string {
  const raw =
    process.env.WORKSPACE_BACKEND?.trim().replace(/\/$/, "") ??
    process.env.MINIO_BACKEND?.trim().replace(/\/$/, "") ??
    "";
  if (raw.length > 0) return raw;
  return "http://127.0.0.1:8000";
}

/** Encode each path segment for upstream paths (keys may contain spaces, unicode, etc.) */
export function encodeObjectKeyPath(key: string): string {
  return key
    .split("/")
    .filter((s) => s.length > 0)
    .map(encodeURIComponent)
    .join("/");
}

export function upstreamProjectsPath(): string {
  return `${getFileServiceBase()}/workspace/projects`;
}

export function upstreamProjectPath(projectId: string): string {
  return `${getFileServiceBase()}/workspace/projects/${encodeURIComponent(projectId)}`;
}

export function upstreamObjectsPath(projectId: string, key: string): string {
  return `${getFileServiceBase()}/workspace/projects/${encodeURIComponent(projectId)}/objects/${encodeObjectKeyPath(key)}`;
}

export function upstreamObjectsMetaPath(projectId: string, key: string): string {
  return `${getFileServiceBase()}/workspace/projects/${encodeURIComponent(projectId)}/meta/${encodeObjectKeyPath(key)}`;
}

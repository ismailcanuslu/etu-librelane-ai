import { FileAPI } from "@/lib/api";

/** Workspace dosyasını tarayıcıda indirir. */
export async function downloadWorkspaceFile(
  projectId: string,
  key: string,
  fileName?: string
): Promise<void> {
  const blob = await FileAPI.getObjectBlob(projectId, key);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName ?? key.split("/").pop() ?? "download";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

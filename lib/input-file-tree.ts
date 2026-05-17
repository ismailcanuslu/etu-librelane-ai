import type { FileNode } from "@/lib/types";
import type { WorkspaceAttachmentDrag } from "@/lib/workspace-drag";

/** Düz dosya anahtar listesinden klasör ağacı oluşturur. */
export function buildTreeFromKeys(keys: string[]): FileNode[] {
  const root: FileNode[] = [];
  const sorted = [...new Set(keys)].sort();

  for (const key of sorted) {
    const parts = key.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      let existing = current.find((n) => n.name === part);

      if (!existing) {
        const dirKey = `${parts.slice(0, i + 1).join("/")}/`;
        existing = {
          name: part,
          type: isLast ? "file" : "dir",
          key: isLast ? key : dirKey,
          ext: isLast && part.includes(".") ? part.split(".").pop() : undefined,
          children: isLast ? undefined : [],
        };
        current.push(existing);
        current.sort((a, b) => {
          if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      }

      if (!isLast) {
        if (!existing.children) existing.children = [];
        current = existing.children;
      }
    }
  }

  return root;
}

/** Sürükle-bırak: dosya veya klasör → eklenecek anahtarlar. */
export function keysFromWorkspaceAttachment(
  attachment: WorkspaceAttachmentDrag,
  projectId: string,
  projectFileKeys: string[]
): string[] {
  if (attachment.bucket !== projectId) return [];

  if (attachment.type === "file") {
    return projectFileKeys.includes(attachment.key) ? [attachment.key] : [];
  }

  const prefix = attachment.key.endsWith("/") ? attachment.key : `${attachment.key}/`;
  return projectFileKeys.filter((k) => k.startsWith(prefix) && !k.endsWith("/"));
}

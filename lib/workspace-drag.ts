export const WORKSPACE_ATTACHMENT_MIME = "application/x-librelane-attachment";

export type WorkspaceAttachmentDrag = {
  bucket: string;
  key: string;
  name: string;
  type: "file" | "dir";
};

export function encodeWorkspaceAttachment(payload: WorkspaceAttachmentDrag): string {
  return JSON.stringify(payload);
}

export function parseWorkspaceAttachment(raw: string): WorkspaceAttachmentDrag | null {
  try {
    const data = JSON.parse(raw) as WorkspaceAttachmentDrag;
    if (!data || typeof data !== "object") return null;
    if (typeof data.bucket !== "string" || typeof data.key !== "string") return null;
    if (typeof data.name !== "string") return null;
    if (data.type !== "file" && data.type !== "dir") return null;
    return data;
  } catch {
    return null;
  }
}

export function readWorkspaceAttachment(dataTransfer: DataTransfer): WorkspaceAttachmentDrag | null {
  const raw = dataTransfer.getData(WORKSPACE_ATTACHMENT_MIME);
  if (!raw) return null;
  return parseWorkspaceAttachment(raw);
}

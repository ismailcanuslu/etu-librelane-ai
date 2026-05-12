import { FileAPI } from "@/lib/api";
import { isTextFile } from "@/lib/types";
import type { ChatAttachmentRef } from "@/lib/types";

const MAX_ATTACHMENT_FILES = 12;
const MAX_ATTACHMENT_BYTES = 32_000;

function fileExt(name: string): string | undefined {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop() : undefined;
}

function trimContent(content: string): string {
  if (content.length <= MAX_ATTACHMENT_BYTES) return content;
  return `${content.slice(0, MAX_ATTACHMENT_BYTES)}\n... (kesildi)`;
}

async function readTextAttachment(projectId: string, key: string): Promise<string | null> {
  const ext = fileExt(key.split("/").pop() ?? key);
  if (!isTextFile(ext)) return null;
  try {
    const text = await FileAPI.getObjectText(projectId, key);
    return trimContent(text);
  } catch {
    return null;
  }
}

async function collectKeysForAttachment(
  projectId: string,
  attachment: ChatAttachmentRef
): Promise<string[]> {
  if (attachment.type === "file") return [attachment.key];
  const prefix = attachment.key.endsWith("/") ? attachment.key : `${attachment.key}/`;
  const objects = await FileAPI.listObjects(projectId, prefix, true);
  return objects
    .filter((object) => !object.key.endsWith("/"))
    .map((object) => object.key)
    .slice(0, MAX_ATTACHMENT_FILES);
}

export async function buildMessageWithAttachments(
  projectId: string,
  message: string,
  attachments: ChatAttachmentRef[]
): Promise<string> {
  if (!attachments.length) return message;

  const blocks: string[] = [];
  for (const attachment of attachments) {
    const keys = await collectKeysForAttachment(projectId, attachment);
    if (attachment.type === "dir") {
      blocks.push(`Klasor: ${attachment.name} (${attachment.key})`);
    } else {
      blocks.push(`Dosya: ${attachment.name} (${attachment.key})`);
    }

    let added = 0;
    for (const key of keys) {
      if (added >= MAX_ATTACHMENT_FILES) break;
      const content = await readTextAttachment(projectId, key);
      if (!content) continue;
      blocks.push(`\`\`\`${fileExt(key) ?? "text"}\n${content}\n\`\`\``);
      added += 1;
    }
    if (added === 0) {
      blocks.push("(Metin olarak okunabilir ek bulunamadi.)");
    }
  }

  return `${message}\n\n---\nEkler:\n${blocks.join("\n\n")}`;
}

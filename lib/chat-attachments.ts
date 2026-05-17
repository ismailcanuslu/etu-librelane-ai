import { FileAPI } from "@/lib/api";
import { isTextFile } from "@/lib/types";
import type { ChatAttachmentRef } from "@/lib/types";
const MAX_ATTACHMENT_FILES = 12;
const MAX_ATTACHMENT_BYTES = 32_000;

export function chatAttachmentId(attachment: ChatAttachmentRef): string {
  if (attachment.lineStart != null && attachment.lineEnd != null) {
    return `${attachment.type}:${attachment.key}:${attachment.lineStart}-${attachment.lineEnd}`;
  }
  return `${attachment.type}:${attachment.key}`;
}

export function formatAttachmentChipLabel(attachment: ChatAttachmentRef): string {
  if (attachment.lineStart != null && attachment.lineEnd != null) {
    return `${attachment.name} · ${attachment.lineStart}–${attachment.lineEnd}`;
  }
  return attachment.name;
}

function fileExt(name: string): string | undefined {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop() : undefined;
}

function fenceLang(key: string): string {
  const ext = fileExt(key.split("/").pop() ?? key)?.toLowerCase();
  if (ext === "v" || ext === "sv" || ext === "svh") return "verilog";
  if (ext === "json") return "json";
  if (ext === "yaml" || ext === "yml") return "yaml";
  const base = key.split("/").pop()?.toLowerCase() ?? "";
  if (base === "config.json") return "json";
  if (base === "config.yaml" || base === "config.yml") return "yaml";
  return ext ?? "text";
}

function trimContent(content: string): string {
  if (content.length <= MAX_ATTACHMENT_BYTES) return content;
  return `${content.slice(0, MAX_ATTACHMENT_BYTES)}\n... (kesildi)`;
}

function extractLines(content: string, lineStart: number, lineEnd: number): string {
  const lines = content.split("\n");
  const start = Math.max(1, lineStart);
  const end = Math.min(lines.length, lineEnd);
  return lines.slice(start - 1, end).join("\n");
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
    if (
      attachment.type === "file" &&
      attachment.lineStart != null &&
      attachment.lineEnd != null
    ) {
      let snippet = attachment.snippet?.trim() ?? "";
      if (!snippet) {
        const full = await readTextAttachment(projectId, attachment.key);
        if (full) {
          snippet = extractLines(full, attachment.lineStart, attachment.lineEnd);
        }
      }
      const lang = fenceLang(attachment.key);
      blocks.push(
        `Dosya parçası: ${attachment.name} (${attachment.key}) satır ${attachment.lineStart}–${attachment.lineEnd}`,
        `\`\`\`${lang}\n${trimContent(snippet)}\n\`\`\``
      );
      continue;
    }

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
      blocks.push(`\`\`\`${fenceLang(key)}\n${content}\n\`\`\``);
      added += 1;
    }
    if (added === 0 && attachment.type === "file" && !attachment.snippet) {
      blocks.push("(Metin olarak okunabilir ek bulunamadi.)");
    }
  }

  return `${message}\n\n---\nEkler:\n${blocks.join("\n\n")}`;
}

/** AI yanıtındaki dosya önerilerini ayrıştırır (**Dosya:** `yol` + kod bloğu vb.). */

export interface ParsedAiFileBlock {
  path: string;
  content: string;
}

const PATH_IN_BACKTICKS =
  /(?:\*\*(?:Dosya|File):?\*\*\s*)?`([^`\n]+)`\s*\r?\n```[\w+.-]*\r?\n([\s\S]*?)```/gi;

const FENCE_WITH_PATH =
  /```([\w+.-]+):([^\n`]+)\r?\n([\s\S]*?)```/g;

const PATH_LINE_BEFORE_FENCE =
  /(?:^|\n)(?:\*\*)?`?([^\n`*]+\.(?:v|sv|vh|svh|json|tcl|md|py|cfg|f))`?(?:\*\*)?\s*\r?\n```[\w+.-]*\r?\n([\s\S]*?)```/gi;

function normalizePath(raw: string): string {
  return raw.trim().replace(/^\.\//, "").replace(/^['"]|['"]$/g, "");
}

function looksLikeFilePath(path: string): boolean {
  const p = path.trim();
  if (!p || p.includes("\n")) return false;
  if (p.includes("/") || p.includes("\\")) return true;
  return /\.(v|sv|vh|svh|json|tcl|md|py|cfg|f)$/i.test(p);
}

function pushBlock(
  results: ParsedAiFileBlock[],
  seen: Set<string>,
  rawPath: string,
  rawContent: string
) {
  const path = normalizePath(rawPath);
  const content = rawContent.replace(/\s+$/, "");
  if (!path || !looksLikeFilePath(path) || seen.has(path)) return;
  seen.add(path);
  results.push({ path, content });
}

export function parseAiFileBlocks(responseText: string): ParsedAiFileBlock[] {
  const results: ParsedAiFileBlock[] = [];
  const seen = new Set<string>();
  const text = responseText.replace(/\r\n/g, "\n");

  for (const match of text.matchAll(PATH_IN_BACKTICKS)) {
    pushBlock(results, seen, match[1], match[2]);
  }

  for (const match of text.matchAll(FENCE_WITH_PATH)) {
    const langOrPath = match[1];
    const maybePath = match[2];
    if (looksLikeFilePath(maybePath)) {
      pushBlock(results, seen, maybePath, match[3]);
    } else if (looksLikeFilePath(langOrPath)) {
      pushBlock(results, seen, langOrPath, match[3]);
    }
  }

  for (const match of text.matchAll(PATH_LINE_BEFORE_FENCE)) {
    pushBlock(results, seen, match[1], match[2]);
  }

  return results;
}

/** AI yanıtındaki **Dosya:** `yol` + kod bloğu önerilerini ayrıştırır. */

export interface ParsedAiFileBlock {
  path: string;
  content: string;
}

const FILE_BLOCK_RE =
  /\*\*(?:Dosya|File):\*\*\s*`([^`]+)`\s*```(?:\w+)?\s*\n([\s\S]*?)```/gi;

export function parseAiFileBlocks(responseText: string): ParsedAiFileBlock[] {
  const results: ParsedAiFileBlock[] = [];
  const seen = new Set<string>();

  for (const match of responseText.matchAll(FILE_BLOCK_RE)) {
    const path = match[1].trim().replace(/^\.\//, "");
    const content = match[2].replace(/\s+$/, "");
    if (!path || seen.has(path)) continue;
    seen.add(path);
    results.push({ path, content });
  }

  return results;
}

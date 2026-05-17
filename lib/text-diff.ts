export type DiffLineType = "same" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

const MAX_LINES_PER_SIDE = 800;

function splitLines(text: string): string[] {
  if (!text) return [];
  return text.replace(/\r\n/g, "\n").split("\n");
}

/** Satır bazlı LCS diff — silinen (kırmızı) ve eklenen (yeşil) satırlar. */
export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const a = splitLines(oldText);
  const b = splitLines(newText);

  if (a.length > MAX_LINES_PER_SIDE || b.length > MAX_LINES_PER_SIDE) {
    return [
      {
        type: "remove",
        text: `… önceki dosya çok uzun (${a.length} satır, önizleme kısaltıldı)`,
      },
      ...a.slice(0, 40).map((text) => ({ type: "remove" as const, text })),
      {
        type: "add",
        text: `… yeni dosya çok uzun (${b.length} satır, önizleme kısaltıldı)`,
      },
      ...b.slice(0, 40).map((text) => ({ type: "add" as const, text })),
    ];
  }

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "remove", text: a[i] });
      i++;
    } else {
      out.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) {
    out.push({ type: "remove", text: a[i] });
    i++;
  }
  while (j < m) {
    out.push({ type: "add", text: b[j] });
    j++;
  }
  return out;
}

export function diffSummary(lines: DiffLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of lines) {
    if (line.type === "add") added++;
    if (line.type === "remove") removed++;
  }
  return { added, removed };
}

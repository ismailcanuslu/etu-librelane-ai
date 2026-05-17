/**
 * Markdown ön işleme — GitHub benzeri blok ayrımı için boş satırlar.
 * (Backend text_format.normalize_model_markdown ile uyumlu + ek kurallar)
 */

export function normalizeMarkdownDisplay(text: string): string {
  if (!text.trim()) return text.trim();

  let s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/[^\S\n]+/g, " ");

  s = s.replace(/\n(#{1,6}\s)/g, "\n\n$1");
  s = s.replace(/\n([-*+]\s)/g, "\n\n$1");
  s = s.replace(/\n(\d+\.\s)/g, "\n\n$1");
  s = s.replace(/\n(>\s)/g, "\n\n$1");
  s = s.replace(/\n(```)/g, "\n\n$1");
  s = s.replace(/(```[^\n]*\n[\s\S]*?```)\n([^\n])/g, "$1\n\n$2");
  s = s.replace(/\n(\|.+\|)\n/g, "\n\n$1\n");
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

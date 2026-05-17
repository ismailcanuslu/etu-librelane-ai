import { createHighlighter, type Highlighter, type BundledLanguage } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const LANG_ALIASES: Record<string, BundledLanguage> = {
  v: "verilog",
  sv: "system-verilog",
  svh: "system-verilog",
  systemverilog: "system-verilog",
  vhdl: "vhdl",
  vhd: "vhdl",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  tcl: "tcl",
  sh: "bash",
  bash: "bash",
  shell: "bash",
  py: "python",
  md: "markdown",
  markdown: "markdown",
  js: "javascript",
  ts: "typescript",
};

const SHIKI_LANGS: BundledLanguage[] = [
  "verilog",
  "system-verilog",
  "json",
  "yaml",
  "tcl",
  "bash",
  "markdown",
  "python",
  "javascript",
  "typescript",
  "vhdl",
];

const LANG_LABELS: Record<string, string> = {
  verilog: "Verilog",
  "system-verilog": "SystemVerilog",
  vhdl: "VHDL",
  json: "JSON",
  yaml: "YAML",
  tcl: "Tcl",
  bash: "Shell",
  python: "Python",
  markdown: "Markdown",
  javascript: "JavaScript",
  typescript: "TypeScript",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function plainCodeHtml(code: string): string {
  return `<pre class="shiki github-dark" style="background-color:#0d1117;color:#e6edf3"><code>${escapeHtml(code)}</code></pre>`;
}

/** Shiki dil kimliği; desteklenmeyen uzantılar için null (düz metin). */
export function resolveShikiLanguage(raw?: string | null): BundledLanguage | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  if (key === "txt" || key === "text") return null;
  if (key in LANG_ALIASES) return LANG_ALIASES[key];
  if (SHIKI_LANGS.includes(key as BundledLanguage)) return key as BundledLanguage;
  return null;
}

/** @deprecated resolveShikiLanguage kullanın */
export function normalizeHighlightLanguage(raw?: string | null): BundledLanguage | null {
  return resolveShikiLanguage(raw);
}

export function languageDisplayLabel(raw?: string | null): string {
  if (!raw) return "Metin";
  const key = raw.toLowerCase().trim();
  if (key === "txt" || key === "text") return "Metin";
  const lang = resolveShikiLanguage(raw);
  if (!lang) return raw.toUpperCase();
  return LANG_LABELS[lang] ?? raw.toUpperCase();
}

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: SHIKI_LANGS,
    });
  }
  return highlighterPromise;
}

export async function highlightCode(code: string, rawLang?: string | null): Promise<string> {
  const lang = resolveShikiLanguage(rawLang);
  if (!lang) return plainCodeHtml(code);

  const highlighter = await getHighlighter();
  try {
    return highlighter.codeToHtml(code, {
      lang,
      theme: "github-dark",
    });
  } catch {
    return plainCodeHtml(code);
  }
}

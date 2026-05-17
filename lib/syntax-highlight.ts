import { createHighlighter, type Highlighter, type BundledLanguage } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const LANG_ALIASES: Record<string, BundledLanguage> = {
  v: "verilog",
  sv: "systemverilog",
  svh: "systemverilog",
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
  txt: "text",
};

const LANG_LABELS: Record<string, string> = {
  verilog: "Verilog",
  systemverilog: "SystemVerilog",
  vhdl: "VHDL",
  json: "JSON",
  yaml: "YAML",
  tcl: "Tcl",
  bash: "Shell",
  python: "Python",
  markdown: "Markdown",
  javascript: "JavaScript",
  typescript: "TypeScript",
  text: "Metin",
};

export function normalizeHighlightLanguage(raw?: string | null): BundledLanguage {
  if (!raw) return "text";
  const key = raw.toLowerCase().trim();
  if (key in LANG_ALIASES) return LANG_ALIASES[key];
  const supported = new Set([
    "verilog",
    "systemverilog",
    "json",
    "yaml",
    "tcl",
    "bash",
    "markdown",
    "text",
    "python",
    "javascript",
    "typescript",
    "vhdl",
  ]);
  if (supported.has(key)) return key as BundledLanguage;
  return "text";
}

export function languageDisplayLabel(raw?: string | null): string {
  const lang = normalizeHighlightLanguage(raw);
  return LANG_LABELS[lang] ?? raw?.toUpperCase() ?? "Kod";
}

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: [
        "verilog",
        "systemverilog",
        "json",
        "yaml",
        "tcl",
        "bash",
        "markdown",
        "text",
        "python",
        "javascript",
        "typescript",
        "vhdl",
      ],
    });
  }
  return highlighterPromise;
}

export async function highlightCode(code: string, rawLang?: string | null): Promise<string> {
  const lang = normalizeHighlightLanguage(rawLang);
  const highlighter = await getHighlighter();
  try {
    return highlighter.codeToHtml(code, {
      lang,
      theme: "github-dark",
    });
  } catch {
    return highlighter.codeToHtml(code, { lang: "text", theme: "github-dark" });
  }
}

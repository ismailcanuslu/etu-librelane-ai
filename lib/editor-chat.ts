import { isOpenlaneConfigFile } from "@/lib/openlane-config-io";

const SNIPPET_EXTENSIONS = new Set(["v", "sv", "svh", "json", "yaml", "yml"]);

/** Caravel RTL yolu — editör/sohbet ile uyumlu */
export const CARAVEL_RTL_PREFIX = "verilog/rtl/";

/** Editörden sohbete eklenebilir dosya türleri. */
export function isChatSnippableFile(nameOrKey: string, ext?: string): boolean {
  const e = (ext ?? nameOrKey.split(".").pop() ?? "").toLowerCase();
  if (SNIPPET_EXTENSIONS.has(e)) return true;
  return isOpenlaneConfigFile(nameOrKey);
}

/** CodeMirror ile sözdizimi vurgulu düzenleme. */
export function isSyntaxHighlightedEditorFile(nameOrKey: string, ext?: string): boolean {
  return isChatSnippableFile(nameOrKey, ext);
}

export function editorLanguageFromKey(key: string): "verilog" | "json" | "yaml" | null {
  const base = key.split("/").pop()?.toLowerCase() ?? "";
  const ext = base.includes(".") ? base.split(".").pop() : "";
  if (ext === "v" || ext === "sv" || ext === "svh") return "verilog";
  if (ext === "json" || base === "config.json") return "json";
  if (ext === "yaml" || ext === "yml" || base === "config.yaml" || base === "config.yml") {
    return "yaml";
  }
  return null;
}

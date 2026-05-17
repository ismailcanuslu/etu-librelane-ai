/** GDS / GDSII dosya yardımcıları */

const GDS_EXTENSIONS = new Set(["gds", "gdsii"]);

export function isGdsFile(nameOrKey: string, ext?: string): boolean {
  const e = (ext ?? nameOrKey.split(".").pop() ?? "").toLowerCase();
  if (GDS_EXTENSIONS.has(e)) return true;
  const lower = nameOrKey.toLowerCase();
  return lower.endsWith(".gds") || lower.endsWith(".gdsii");
}

export function gdsViewerTabKey(objectKey: string): string {
  return `gds:${objectKey}`;
}

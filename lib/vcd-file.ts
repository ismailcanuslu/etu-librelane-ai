/** VCD (Value Change Dump) dosya yardımcıları */

export function isVcdFile(nameOrKey: string, ext?: string): boolean {
  const e = (ext ?? nameOrKey.split(".").pop() ?? "").toLowerCase();
  if (e === "vcd") return true;
  return nameOrKey.toLowerCase().endsWith(".vcd");
}

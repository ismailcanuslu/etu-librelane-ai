import { FileAPI } from "@/lib/api";

export const PLAN_DIR = "plans";

/** Yeni plan dosyası anahtarı: plans/plan-2026-05-17T12-30-45.md */
export function buildPlanObjectKey(date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${PLAN_DIR}/plan-${stamp}.md`;
}

export function planFileDisplayName(key: string): string {
  return key.split("/").pop() ?? key;
}

export async function savePlanToWorkspace(
  projectId: string,
  key: string,
  markdown: string
): Promise<void> {
  const header = `# Plan\n\n_Oluşturulma: ${new Date().toISOString()}_\n\n---\n\n`;
  const body = markdown.trim();
  const content = body.startsWith("#") ? body : `${header}${body}`;
  await FileAPI.putObject(
    projectId,
    key,
    new Blob([content], { type: "text/markdown" }),
    "text/markdown"
  );
}

export const PLAN_APPROVE_PROMPT_PREFIX =
  "Aşağıdaki onaylanmış planı uygula. Adım adım ilerle; her dosya değişikliğinden önce ne yaptığını kısaca belirt.\n\n---\n\n";

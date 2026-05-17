import { FileAPI } from "@/lib/api";
import type { ProposedFileChange } from "@/lib/types";
import { requestWorkspaceRefresh } from "@/lib/workspace-events";
import type { ParsedAiFileBlock } from "@/lib/parse-ai-files";

export async function resolveProposedFileChanges(
  projectId: string,
  blocks: ParsedAiFileBlock[]
): Promise<ProposedFileChange[]> {
  const results: ProposedFileChange[] = [];

  for (const block of blocks) {
    let oldContent = "";
    try {
      oldContent = await FileAPI.getObjectText(projectId, block.path);
    } catch {
      oldContent = "";
    }
    const isNew = oldContent === "";
    if (!isNew && oldContent === block.content) continue;

    results.push({
      path: block.path,
      oldContent,
      newContent: block.content,
      isNew,
    });
  }

  return results;
}

export async function applyApprovedFileChanges(
  projectId: string,
  files: ProposedFileChange[],
  paths: string[]
): Promise<void> {
  const selected = new Set(paths);
  for (const file of files) {
    if (!selected.has(file.path)) continue;
    await FileAPI.putObject(
      projectId,
      file.path,
      new Blob([file.newContent], { type: "text/plain" }),
      "text/plain"
    );
  }
  requestWorkspaceRefresh(projectId);
}

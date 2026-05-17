import type { ChatAttachmentRef, RunPreview } from "./types";

export const WORKSPACE_REFRESH_EVENT = "librelane:workspace-refresh";
export const OPEN_TOOL_RUN_TAB_EVENT = "librelane:open-tool-run-tab";
export const ADD_CHAT_SELECTION_EVENT = "librelane:add-chat-selection";

export interface OpenToolRunTabDetail {
  projectId: string;
  action: string;
  preview: RunPreview;
  /** pending-… veya job uuid — sekme kimliği */
  runId: string;
  jobId?: string;
  selectedInputFiles?: string[];
}

export interface AddChatSelectionDetail {
  attachment: ChatAttachmentRef;
}

export function requestWorkspaceRefresh(projectId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_REFRESH_EVENT, {
      detail: { projectId },
    })
  );
}

export function requestOpenToolRunTab(detail: OpenToolRunTabDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(OPEN_TOOL_RUN_TAB_EVENT, {
      detail,
    })
  );
}

export function requestAddChatSelection(detail: AddChatSelectionDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ADD_CHAT_SELECTION_EVENT, {
      detail,
    })
  );
}

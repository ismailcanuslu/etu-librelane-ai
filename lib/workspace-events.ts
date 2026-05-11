export const WORKSPACE_REFRESH_EVENT = "librelane:workspace-refresh";

export function requestWorkspaceRefresh(projectId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(WORKSPACE_REFRESH_EVENT, {
      detail: { projectId },
    })
  );
}

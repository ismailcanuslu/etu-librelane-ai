export const WORKSPACE_LAYOUT_STORAGE_KEY = "librelane.workspace.layout";

export type WorkspaceLayout = {
  sidebarWidth: number;
  terminalHeight: number;
  agentPanelWidth: number;
};

export const WORKSPACE_LAYOUT_DEFAULTS: WorkspaceLayout = {
  sidebarWidth: 256,
  terminalHeight: 220,
  agentPanelWidth: 380,
};

export const WORKSPACE_LAYOUT_LIMITS = {
  sidebarWidth: { min: 200, max: 340 },
  terminalHeight: { min: 96, max: 420 },
  agentPanelWidth: { min: 280, max: 480 },
} as const;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function loadWorkspaceLayout(): WorkspaceLayout {
  if (typeof window === "undefined") return WORKSPACE_LAYOUT_DEFAULTS;
  try {
    const raw = localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    if (!raw) return WORKSPACE_LAYOUT_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<WorkspaceLayout>;
    return {
      sidebarWidth: clamp(
        Number(parsed.sidebarWidth) || WORKSPACE_LAYOUT_DEFAULTS.sidebarWidth,
        WORKSPACE_LAYOUT_LIMITS.sidebarWidth.min,
        WORKSPACE_LAYOUT_LIMITS.sidebarWidth.max
      ),
      terminalHeight: clamp(
        Number(parsed.terminalHeight) || WORKSPACE_LAYOUT_DEFAULTS.terminalHeight,
        WORKSPACE_LAYOUT_LIMITS.terminalHeight.min,
        WORKSPACE_LAYOUT_LIMITS.terminalHeight.max
      ),
      agentPanelWidth: clamp(
        Number(parsed.agentPanelWidth) || WORKSPACE_LAYOUT_DEFAULTS.agentPanelWidth,
        WORKSPACE_LAYOUT_LIMITS.agentPanelWidth.min,
        WORKSPACE_LAYOUT_LIMITS.agentPanelWidth.max
      ),
    };
  } catch {
    return WORKSPACE_LAYOUT_DEFAULTS;
  }
}

export function saveWorkspaceLayout(layout: WorkspaceLayout): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore quota / private mode
  }
}

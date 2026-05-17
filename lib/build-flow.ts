/** Derleme sekmesindeki 5 aşamalı akış sırası */
export const BUILD_FLOW_ORDER = [
  "lint",
  "synthesis",
  "verification",
  "simulation",
  "openlane1-flow",
] as const;

export type BuildFlowActionId = (typeof BUILD_FLOW_ORDER)[number];

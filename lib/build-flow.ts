/** Derleme sekmesindeki 5 aşamalı akış sırası (tape-out değil; wrapper GDS adım 5’te) */
export const BUILD_FLOW_ORDER = [
  "lint",
  "synthesis",
  "verification",
  "simulation",
  "openlane1-flow",
] as const;

export type BuildFlowActionId = (typeof BUILD_FLOW_ORDER)[number];

/** Web şeridinde adım 5’ten sonra gösterilen tape-out bilgi adımı (harici Caravel işi). */
export const TAPEOUT_FOLLOWUP_STEP = {
  id: "tapeout-caravel",
  stepLabel: "5.1",
  title: "Tape-out (Caravel + IO pad)",
  shortTitle: "Tape-out",
  description:
    "Wrapper GDS tape-out değildir. Tam çip için Caravel harness, IO pad wrapper (padframe) ve caravel/README.md — web dışı.",
  guideFile: "guide.md",
  harnessReadme: "caravel/README.md",
} as const;

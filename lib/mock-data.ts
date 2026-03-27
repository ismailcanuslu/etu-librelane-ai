// Mock / demo data kept for UI fallbacks.
import type { Project } from "./types";

export const MOCK_PROJECTS: Project[] = [
  {
    id: "proj-1",
    name: "UART Controller",
    bucket: "uart-controller",
    createdAt: "2026-03-25T00:00:00.000Z",
  },
  {
    id: "proj-2",
    name: "ALU Design",
    bucket: "alu-design",
    createdAt: "2026-03-25T00:00:00.000Z",
  },
];

export type { Role, Message, Project } from "./types";

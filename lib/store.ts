"use client";

import type { Message, Project } from "./types";

const ACTIVE_PROJECT_KEY = "librelane_active_project";
const PROJECTS_KEY = "librelane_projects";

export type { Message, Project };

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function getActiveProjectId(): string {
  return safe(() => localStorage.getItem(ACTIVE_PROJECT_KEY) ?? "", "");
}

export function saveActiveProjectId(id: string): void {
  safe(() => localStorage.setItem(ACTIVE_PROJECT_KEY, id), undefined);
}

export function getProjects(): Project[] {
  return safe(() => {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }, []);
}

export function saveProjects(projects: Project[]): void {
  safe(() => localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)), undefined);
}

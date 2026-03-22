"use client";

import { Message, Project, MOCK_PROJECTS, MOCK_HISTORIES } from "./mock-data";

const SETTINGS_KEY = "librelane_settings";
const ACTIVE_PROJECT_KEY = "librelane_active_project";
const PROJECTS_KEY = "librelane_projects";
const HISTORY_PREFIX = "librelane_history_";

export interface Settings {
  apiKey: string;
  aiProvider: string;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  aiProvider: "claude-sonnet-4-5",
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

// Settings
export function getSettings(): Settings {
  return safe(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  safe(() => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)), undefined);
}

// Active project
export function getActiveProjectId(): string {
  return safe(() => localStorage.getItem(ACTIVE_PROJECT_KEY) ?? MOCK_PROJECTS[0].id, MOCK_PROJECTS[0].id);
}

export function saveActiveProjectId(id: string): void {
  safe(() => localStorage.setItem(ACTIVE_PROJECT_KEY, id), undefined);
}

// Projects list
export function getProjects(): Project[] {
  return safe(() => {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : MOCK_PROJECTS;
  }, MOCK_PROJECTS);
}

export function saveProjects(projects: Project[]): void {
  safe(() => localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)), undefined);
}

// Per-project chat history
export function getChatHistory(projectId: string): Message[] {
  return safe(() => {
    const raw = localStorage.getItem(HISTORY_PREFIX + projectId);
    if (raw) return JSON.parse(raw);
    return MOCK_HISTORIES[projectId] ?? [];
  }, MOCK_HISTORIES[projectId] ?? []);
}

export function saveChatHistory(projectId: string, messages: Message[]): void {
  safe(() => localStorage.setItem(HISTORY_PREFIX + projectId, JSON.stringify(messages)), undefined);
}

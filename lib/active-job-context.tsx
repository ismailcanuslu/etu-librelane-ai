"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  closeTerminalTab,
  getJobLog,
  listTerminalTabs,
  openTerminalTab,
  parsePersistedJobLog,
  startJob,
  subscribeJob,
  cancelJob,
  resetAllRunnerJobs,
  type JobSubscription,
} from "./job-client";
import { requestWorkspaceRefresh } from "./workspace-events";
import type { JobLineEvent, JobStatus, JobStatusEvent } from "./types";

export interface RunningJobState {
  jobId: string;
  action: string;
  projectId: string;
  status: JobStatus | "preparing";
  startedAt: number;
  exitCode: number | null;
  lines: JobLineEvent[];
  notes: string[];
  finishedAt: number | null;
  logObjectKey: string | null;
  artifactsPrefix: string | null;
}

interface ActiveJobContextValue {
  tabs: RunningJobState[];
  activeTabId: string | null;
  active: RunningJobState | null;
  setActiveTab: (jobId: string) => void;
  start: (
    projectId: string,
    action: string,
    options?: {
      designName?: string;
      args?: string[];
      inputFiles?: string[];
      flowSteps?: string[];
    }
  ) => Promise<{ job_id: string }>;
  attach: (jobId: string, projectId: string, action: string) => Promise<void>;
  cancel: (jobId?: string) => Promise<void>;
  closeTab: (jobId: string) => Promise<void>;
  clear: () => Promise<void>;
  /** SIGINT + semafor sifirla; tum terminal sekmelerini temizler */
  resetTerminal: (projectId?: string) => Promise<void>;
}

const ActiveJobContext = createContext<ActiveJobContextValue | null>(null);

const MAX_TERMINAL_TABS = 8;

function createJobState(jobId: string, projectId: string, action: string): RunningJobState {
  return {
    jobId,
    action,
    projectId,
    status: "queued",
    startedAt: Date.now(),
    exitCode: null,
    lines: [],
    notes: [],
    finishedAt: null,
    logObjectKey: null,
    artifactsPrefix: null,
  };
}

export function ActiveJobProvider({
  children,
  projectId,
}: {
  children: ReactNode;
  projectId?: string;
}) {
  const [tabs, setTabs] = useState<RunningJobState[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const subsRef = useRef<Map<string, JobSubscription>>(new Map());
  const tabsRef = useRef<RunningJobState[]>([]);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  const teardown = useCallback((jobId: string) => {
    subsRef.current.get(jobId)?.close();
    subsRef.current.delete(jobId);
  }, []);

  const updateTab = useCallback((jobId: string, updater: (prev: RunningJobState) => RunningJobState) => {
    setTabs((prev) => prev.map((tab) => (tab.jobId === jobId ? updater(tab) : tab)));
  }, []);

  const ensureSubscription = useCallback(
    (jobId: string, projectId: string, action: string) => {
      if (subsRef.current.has(jobId)) return;

      const hydrateFromPersistedLog = async () => {
        try {
          const text = await getJobLog(jobId);
          const parsed = parsePersistedJobLog(text);
          if (parsed.length === 0) return;
          setTabs((prev) =>
            prev.map((tab) =>
              tab.jobId === jobId && tab.lines.length === 0 ? { ...tab, lines: parsed } : tab
            )
          );
        } catch {
          // log henüz workspace'e yazılmamış olabilir
        }
      };

      subsRef.current.set(
        jobId,
        subscribeJob(jobId, {
          onSnapshot: (snap) => {
            updateTab(jobId, (prev) => ({
              ...prev,
              status: (snap.status as JobStatus) ?? prev.status,
              exitCode: snap.exit_code ?? prev.exitCode,
              action: snap.action ?? prev.action,
            }));
            if (snap.status === "done" || snap.status === "failed" || snap.status === "cancelled") {
              void hydrateFromPersistedLog();
            }
          },
          onStatus: (st: JobStatusEvent) => {
            updateTab(jobId, (prev) => {
              const next: RunningJobState = {
                ...prev,
                status: st.status,
                notes: st.message ? [...prev.notes, st.message] : prev.notes,
              };
              if (st.status === "cancelled") {
                next.finishedAt = prev.finishedAt ?? Date.now();
                next.exitCode = prev.exitCode ?? 130;
              }
              if (st.message) {
                next.lines = [
                  ...prev.lines,
                  {
                    stream: "system",
                    line: st.message,
                    ts: new Date().toISOString(),
                  },
                ];
              }
              return next;
            });
          },
          onLine: (line: JobLineEvent) => {
            updateTab(jobId, (prev) => ({ ...prev, lines: [...prev.lines, line] }));
          },
          onDone: (done) => {
            updateTab(jobId, (prev) => ({
              ...prev,
              status: done.status,
              exitCode: done.exit_code,
              finishedAt: Date.now(),
              logObjectKey: done.log_object_key,
              artifactsPrefix: done.artifacts_prefix,
            }));
            requestWorkspaceRefresh(projectId);
            void hydrateFromPersistedLog();
          },
          onError: (err) => {
            updateTab(jobId, (prev) => {
              const message = `! ${err.message}`;
              return {
                ...prev,
                status: "failed",
                exitCode: prev.exitCode ?? -1,
                finishedAt: prev.finishedAt ?? Date.now(),
                notes: [...prev.notes, message],
                lines: [
                  ...prev.lines,
                  { stream: "system", line: message, ts: new Date().toISOString() },
                ],
              };
            });
          },
        })
      );
    },
    [updateTab]
  );

  const openTab = useCallback(
    (jobId: string, projectId: string, action: string) => {
      setTabs((prev) => {
        if (prev.some((tab) => tab.jobId === jobId)) return prev;
        const next = [...prev, createJobState(jobId, projectId, action)];
        if (next.length <= MAX_TERMINAL_TABS) return next;
        const removable = next.find((tab) => tab.finishedAt !== null) ?? next[0];
        teardown(removable.jobId);
        return next.filter((tab) => tab.jobId !== removable.jobId);
      });
      setActiveTabId(jobId);
      ensureSubscription(jobId, projectId, action);
    },
    [ensureSubscription, teardown]
  );

  const start = useCallback(
    async (
      projectId: string,
      action: string,
      options?: { designName?: string; args?: string[]; inputFiles?: string[] }
    ) => {
      const res = await startJob(projectId, action, options);
      openTab(res.job_id, projectId, action);
      return res;
    },
    [openTab]
  );

  const attach = useCallback(
    async (jobId: string, projectId: string, action: string) => {
      try {
        await openTerminalTab(jobId);
      } catch {
        // geçmiş job için sekme kaydı oluşturulamayabilir
      }
      openTab(jobId, projectId, action);
    },
    [openTab]
  );

  const setActiveTab = useCallback((jobId: string) => {
    setActiveTabId(jobId);
  }, []);

  const cancel = useCallback(async (jobId?: string) => {
    const targetId = jobId ?? activeTabId;
    if (!targetId) return;
    const target = tabsRef.current.find((tab) => tab.jobId === targetId);
    if (!target || target.finishedAt) return;
    try {
      await cancelJob(targetId);
      updateTab(targetId, (prev) =>
        !prev.finishedAt
          ? {
              ...prev,
              status: "cancelled",
              exitCode: 130,
              finishedAt: Date.now(),
            }
          : prev
      );
    } catch {
      // ignore
    }
  }, [activeTabId, updateTab]);

  const closeTab = useCallback(
    async (jobId: string) => {
      teardown(jobId);
      try {
        await closeTerminalTab(jobId);
      } catch {
        // ignore
      }
      setTabs((prev) => {
        const next = prev.filter((tab) => tab.jobId !== jobId);
        setActiveTabId((current) => {
          if (current !== jobId) return current;
          const idx = prev.findIndex((tab) => tab.jobId === jobId);
          const fallback = next[idx] ?? next[idx - 1];
          return fallback?.jobId ?? null;
        });
        return next;
      });
    },
    [teardown]
  );

  const clear = useCallback(async () => {
    if (!activeTabId) return;
    await closeTab(activeTabId);
  }, [activeTabId, closeTab]);

  const resetTerminal = useCallback(
    async (scopeProjectId?: string) => {
      const scope = scopeProjectId ?? projectId;
      const live = tabsRef.current.filter((tab) => !tab.finishedAt);
      for (const tab of live) {
        try {
          await cancelJob(tab.jobId);
        } catch {
          // ignore
        }
        teardown(tab.jobId);
        try {
          await closeTerminalTab(tab.jobId);
        } catch {
          // ignore
        }
      }
      try {
        await resetAllRunnerJobs(scope);
      } catch {
        // backend kapali olabilir; yine de UI temizlensin
      }
      setTabs([]);
      setActiveTabId(null);
    },
    [projectId, teardown]
  );

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    void (async () => {
      try {
        const remoteTabs = await listTerminalTabs(projectId);
        if (cancelled) return;
        for (const tab of remoteTabs) {
          if (cancelled) break;
          openTab(tab.job_id, tab.project_id, tab.action);
        }
      } catch {
        // backend henüz sekmeleri sunmuyor olabilir
      }
    })();

    return () => {
      cancelled = true;
    };
    // Proje değişince sunucudaki açık sekmeleri bir kez yükle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    return () => {
      for (const sub of subsRef.current.values()) {
        sub.close();
      }
      subsRef.current.clear();
    };
  }, []);

  const active = useMemo(() => {
    if (!activeTabId) return tabs[0] ?? null;
    return tabs.find((tab) => tab.jobId === activeTabId) ?? tabs[0] ?? null;
  }, [activeTabId, tabs]);

  const value = useMemo<ActiveJobContextValue>(
    () => ({
      tabs,
      activeTabId,
      active,
      setActiveTab,
      start,
      attach,
      cancel,
      closeTab,
      clear,
      resetTerminal,
    }),
    [tabs, activeTabId, active, setActiveTab, start, attach, cancel, closeTab, clear, resetTerminal]
  );

  return <ActiveJobContext.Provider value={value}>{children}</ActiveJobContext.Provider>;
}

export function useActiveJob(): ActiveJobContextValue {
  const ctx = useContext(ActiveJobContext);
  if (!ctx) throw new Error("useActiveJob must be used within ActiveJobProvider");
  return ctx;
}

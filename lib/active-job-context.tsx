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
import { getJobLog, parsePersistedJobLog, startJob, subscribeJob, cancelJob } from "./job-client";
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
  /** Mesai mesajları (preparing, container_id, vs.) */
  notes: string[];
  finishedAt: number | null;
  logObjectKey: string | null;
  artifactsPrefix: string | null;
}

interface ActiveJobContextValue {
  active: RunningJobState | null;
  /** Backend'e POST /run yapar, yeni job'a abone olur. Önceki job hâlâ izleniyorsa onu bırakır. */
  start: (
    projectId: string,
    action: string,
    options?: { designName?: string; args?: string[] }
  ) => Promise<{ job_id: string }>;
  /** Verili job'a (örn. geçmişten) sadece görüntüleme için bağlan — yeni job başlatmaz, snapshot+stream alır. */
  attach: (jobId: string, projectId: string, action: string) => void;
  /** Aktif job'u iptal etmeye çalışır. */
  cancel: () => Promise<void>;
  /** Aktif job state'ini temizler ama subscription'ı close eder. */
  clear: () => void;
}

const ActiveJobContext = createContext<ActiveJobContextValue | null>(null);

export function ActiveJobProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<RunningJobState | null>(null);
  const subRef = useRef<{ close(): void } | null>(null);

  const teardown = useCallback(() => {
    subRef.current?.close();
    subRef.current = null;
  }, []);

  const subscribe = useCallback(
    (jobId: string, projectId: string, action: string) => {
      teardown();

      setActive({
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
      });

      const hydrateFromPersistedLog = async () => {
        try {
          const text = await getJobLog(jobId);
          const parsed = parsePersistedJobLog(text);
          if (parsed.length === 0) return;
          setActive((prev) =>
            prev && prev.jobId === jobId && prev.lines.length === 0
              ? { ...prev, lines: parsed }
              : prev
          );
        } catch {
          // log henüz workspace'e yazılmamış olabilir
        }
      };

      subRef.current = subscribeJob(jobId, {
        onSnapshot: (snap) => {
          setActive((prev) =>
            prev && prev.jobId === jobId
              ? {
                  ...prev,
                  status: (snap.status as JobStatus) ?? prev.status,
                  exitCode: snap.exit_code ?? prev.exitCode,
                  action: snap.action ?? prev.action,
                }
              : prev
          );
          if (snap.status === "done" || snap.status === "failed" || snap.status === "cancelled") {
            void hydrateFromPersistedLog();
          }
        },
        onStatus: (st: JobStatusEvent) => {
          setActive((prev) => {
            if (!prev || prev.jobId !== jobId) return prev;
            const next: RunningJobState = {
              ...prev,
              status: st.status,
              notes: st.message ? [...prev.notes, st.message] : prev.notes,
            };
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
          setActive((prev) =>
            prev && prev.jobId === jobId
              ? { ...prev, lines: [...prev.lines, line] }
              : prev
          );
        },
        onDone: (done) => {
          setActive((prev) =>
            prev && prev.jobId === jobId
              ? {
                  ...prev,
                  status: done.status,
                  exitCode: done.exit_code,
                  finishedAt: Date.now(),
                  logObjectKey: done.log_object_key,
                  artifactsPrefix: done.artifacts_prefix,
                }
              : prev
          );
          requestWorkspaceRefresh(projectId);
          void hydrateFromPersistedLog();
        },
        onError: (err) => {
          setActive((prev) => {
            if (!prev || prev.jobId !== jobId) return prev;
            const message = `! ${err.message}`;
            return {
              ...prev,
              notes: [...prev.notes, message],
              lines: [
                ...prev.lines,
                { stream: "system", line: message, ts: new Date().toISOString() },
              ],
            };
          });
        },
      });
    },
    [teardown]
  );

  const start = useCallback(
    async (
      projectId: string,
      action: string,
      options?: { designName?: string; args?: string[] }
    ) => {
      const res = await startJob(projectId, action, options);
      subscribe(res.job_id, projectId, action);
      return res;
    },
    [subscribe]
  );

  const attach = useCallback(
    (jobId: string, projectId: string, action: string) => {
      subscribe(jobId, projectId, action);
    },
    [subscribe]
  );

  const cancel = useCallback(async () => {
    if (!active) return;
    try {
      await cancelJob(active.jobId);
    } catch {
      // ignore
    }
  }, [active]);

  const clear = useCallback(() => {
    teardown();
    setActive(null);
  }, [teardown]);

  useEffect(() => {
    return () => {
      subRef.current?.close();
      subRef.current = null;
    };
  }, []);

  const value = useMemo<ActiveJobContextValue>(
    () => ({ active, start, attach, cancel, clear }),
    [active, start, attach, cancel, clear]
  );

  return <ActiveJobContext.Provider value={value}>{children}</ActiveJobContext.Provider>;
}

export function useActiveJob(): ActiveJobContextValue {
  const ctx = useContext(ActiveJobContext);
  if (!ctx) throw new Error("useActiveJob must be used within ActiveJobProvider");
  return ctx;
}

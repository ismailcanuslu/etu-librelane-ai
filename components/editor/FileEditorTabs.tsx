"use client";

import { useEffect, useCallback, useRef } from "react";
import { X, Save, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTab } from "@/lib/types";
import { FileAPI } from "@/lib/api";

interface FileEditorTabsProps {
  tabs: FileTab[];
  activeKey: string;
  onTabChange: (key: string) => void;
  onTabClose: (key: string) => void;
  onTabUpdate: (key: string, patch: Partial<FileTab>) => void;
}

const LINE_NUMBERS_WIDTH = 48;

function lineCount(text: string) {
  return text.split("\n").length;
}

// ─── Single Editor Pane ───────────────────────────────────────────────────────

interface EditorPaneProps {
  tab: FileTab;
  onUpdate: (patch: Partial<FileTab>) => void;
}

function EditorPane({ tab, onUpdate }: EditorPaneProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  // Keep a stable ref to tab so Ctrl+S always sees the latest content
  const tabRef = useRef(tab);
  tabRef.current = tab;

  function handleScroll() {
    if (linesRef.current && textareaRef.current) {
      linesRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  async function handleSave() {
    if (saving.current) return;
    saving.current = true;
    onUpdate({ dirty: false });
    try {
      const { content, bucket, key } = tabRef.current;
      await FileAPI.putObject(
        bucket,
        key,
        new Blob([content], { type: "text/plain" }),
        "text/plain"
      );
    } catch (err) {
      onUpdate({ dirty: true });
      console.error("save failed", err);
    } finally {
      saving.current = false;
    }
  }

  // Ctrl+S / Cmd+S — stable listener, uses tabRef to avoid stale closure
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        const active = document.activeElement;
        if (!active || active === textareaRef.current || active === document.body) {
          e.preventDefault();
          handleSave();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = lineCount(tab.content);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between border-b border-white/8 bg-[#0d1117] px-4 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono">{tab.key}</span>
          {tab.dirty && <span className="text-amber-400 text-[10px]">● Kaydedilmedi</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={!tab.dirty}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
            tab.dirty
              ? "bg-violet-600 text-white hover:bg-violet-500"
              : "bg-white/5 text-slate-600 cursor-default"
          )}
          title="Kaydet (Ctrl+S)"
        >
          <Save className="h-3 w-3" />
          Kaydet
        </button>
      </div>

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden font-mono text-xs">
        {/* Line numbers */}
        <div
          ref={linesRef}
          className="select-none overflow-hidden bg-[#0a0f16] text-slate-600 text-right"
          style={{ width: LINE_NUMBERS_WIDTH, paddingTop: "12px", paddingRight: "10px" }}
          aria-hidden
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="leading-5">{i + 1}</div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={tab.content}
          onChange={(e) => onUpdate({ content: e.target.value, dirty: true })}
          onScroll={handleScroll}
          spellCheck={false}
          className="flex-1 resize-none bg-[#0d1117] text-slate-200 leading-5 outline-none p-3 pl-2"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}

// ─── Loading pane ─────────────────────────────────────────────────────────────

function LoadingPane() {
  return (
    <div className="flex flex-1 items-center justify-center text-slate-600">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

function ErrorPane({ message }: { message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-2 text-rose-400 text-sm">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

// ─── FileEditorTabs ───────────────────────────────────────────────────────────

export default function FileEditorTabs({
  tabs,
  activeKey,
  onTabChange,
  onTabClose,
  onTabUpdate,
}: FileEditorTabsProps) {
  const activeTab = tabs.find((t) => t.key === activeKey);

  /**
   * loadingKeys: tabs currently being fetched (prevents parallel duplicate fetches)
   * loadedKeys:  tabs that have been fetched at least once (prevents re-fetch on re-render)
   * errorKeys:   tabs that failed to load, keyed to error message
   *
   * All three are refs so mutations don't trigger extra renders;
   * the parent's onTabUpdate call is what triggers the re-render after load.
   */
  const loadingKeys = useRef<Set<string>>(new Set());
  const loadedKeys = useRef<Set<string>>(new Set());
  const errorKeys = useRef<Map<string, string>>(new Map());

  const loadTab = useCallback(
    async (tab: FileTab) => {
      // Skip if already loading or already loaded (loaded = success OR error)
      if (loadingKeys.current.has(tab.key) || loadedKeys.current.has(tab.key)) return;
      loadingKeys.current.add(tab.key);
      try {
        const text = await FileAPI.getObjectText(tab.bucket, tab.key);
        loadedKeys.current.add(tab.key);
        errorKeys.current.delete(tab.key);
        onTabUpdate(tab.key, { content: text, dirty: false });
      } catch (err) {
        loadedKeys.current.add(tab.key); // mark as attempted so we don't retry forever
        errorKeys.current.set(tab.key, err instanceof Error ? err.message : String(err));
        onTabUpdate(tab.key, { content: "" });
      } finally {
        loadingKeys.current.delete(tab.key);
      }
    },
    [onTabUpdate]
  );

  // Load any tab that hasn't been loaded yet.
  // Runs whenever tabs array changes (new tab opened).
  useEffect(() => {
    for (const tab of tabs) {
      if (!loadedKeys.current.has(tab.key) && !loadingKeys.current.has(tab.key)) {
        loadTab(tab);
      }
    }
  }, [tabs, loadTab]);

  // Clean up state for tabs that were closed so they reload fresh if reopened.
  useEffect(() => {
    const currentKeys = new Set(tabs.map((t) => t.key));
    for (const key of loadedKeys.current) {
      if (!currentKeys.has(key)) {
        loadedKeys.current.delete(key);
        errorKeys.current.delete(key);
      }
    }
  }, [tabs]);

  if (tabs.length === 0) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-end border-b border-white/8 bg-[#0a0f16] overflow-x-auto flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              "group flex items-center gap-1.5 border-r border-white/8 px-3 py-2 text-xs transition-colors flex-shrink-0 max-w-[180px]",
              tab.key === activeKey
                ? "bg-[#0d1117] text-slate-200 border-t border-t-violet-500"
                : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
            )}
          >
            <span className="truncate">{tab.name}</span>
            {tab.dirty && <span className="text-amber-400 flex-shrink-0">•</span>}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.key); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onTabClose(tab.key); } }}
              className={cn(
                "flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded transition-colors",
                "text-slate-600 hover:text-slate-300",
                tab.key !== activeKey && "opacity-0 group-hover:opacity-100"
              )}
              title="Kapat"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          </button>
        ))}
      </div>

      {/* Active pane */}
      {activeTab ? (
        errorKeys.current.has(activeTab.key) ? (
          <ErrorPane message={errorKeys.current.get(activeTab.key)!} />
        ) : loadingKeys.current.has(activeTab.key) || !loadedKeys.current.has(activeTab.key) ? (
          <LoadingPane />
        ) : (
          <EditorPane
            key={activeTab.key}
            tab={activeTab}
            onUpdate={(patch) => onTabUpdate(activeTab.key, patch)}
          />
        )
      ) : (
        <LoadingPane />
      )}
    </div>
  );
}

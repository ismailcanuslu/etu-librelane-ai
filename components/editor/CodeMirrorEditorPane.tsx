"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { verilog } from "@codemirror/legacy-modes/mode/verilog";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import { MessageSquarePlus, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTab } from "@/lib/types";
import { FileAPI } from "@/lib/api";
import { editorLanguageFromKey } from "@/lib/editor-chat";
import { requestAddChatSelection } from "@/lib/workspace-events";

interface CodeMirrorEditorPaneProps {
  tab: FileTab;
  onUpdate: (patch: Partial<FileTab>) => void;
}

interface SelectionToolbar {
  top: number;
  left: number;
  lineStart: number;
  lineEnd: number;
  snippet: string;
}

function buildExtensions(lang: ReturnType<typeof editorLanguageFromKey>) {
  if (lang === "json") return [json()];
  if (lang === "yaml") return [yaml()];
  if (lang === "verilog") return [StreamLanguage.define(verilog)];
  return [];
}

export default function CodeMirrorEditorPane({ tab, onUpdate }: CodeMirrorEditorPaneProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const saving = useRef(false);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [toolbar, setToolbar] = useState<SelectionToolbar | null>(null);
  const lang = editorLanguageFromKey(tab.key);

  const updateSelectionToolbar = useCallback(() => {
    const view = editorRef.current?.view;
    if (!view) {
      setToolbar(null);
      return;
    }
    const { from, to } = view.state.selection.main;
    if (from === to) {
      setToolbar(null);
      return;
    }
    const startLine = view.state.doc.lineAt(from).number;
    const endLine = view.state.doc.lineAt(to).number;
    const snippet = view.state.sliceDoc(from, to);
    if (!snippet.trim()) {
      setToolbar(null);
      return;
    }
    const coords = view.coordsAtPos(to);
    const container = view.dom.getBoundingClientRect();
    if (!coords) {
      setToolbar(null);
      return;
    }
    setToolbar({
      top: coords.bottom - container.top + 8,
      left: Math.min(coords.left - container.left, container.width - 140),
      lineStart: startLine,
      lineEnd: endLine,
      snippet,
    });
  }, []);

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        const view = editorRef.current?.view;
        if (view?.hasFocus) {
          e.preventDefault();
          void handleSave();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleAddToChat() {
    if (!toolbar) return;
    requestAddChatSelection({
      attachment: {
        type: "file",
        key: tab.key,
        name: tab.name,
        lineStart: toolbar.lineStart,
        lineEnd: toolbar.lineEnd,
        snippet: toolbar.snippet,
      },
    });
    setToolbar(null);
    const view = editorRef.current?.view;
    if (view) {
      view.dispatch({
        selection: { anchor: view.state.selection.main.anchor },
      });
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#0d1117] px-4 py-1.5 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-mono">{tab.key}</span>
          {tab.dirty && <span className="text-amber-400 text-[10px]">● Kaydedilmedi</span>}
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
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

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <CodeMirror
          ref={editorRef}
          value={tab.content}
          height="100%"
          theme={oneDark}
          extensions={[
            ...buildExtensions(lang),
            EditorView.lineWrapping,
            EditorView.theme({
              "&": { height: "100%", fontSize: "12px", backgroundColor: "#0d1117" },
              ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
              ".cm-selectionBackground": { backgroundColor: "rgba(56, 139, 253, 0.35) !important" },
              "&.cm-focused .cm-selectionBackground": {
                backgroundColor: "rgba(56, 139, 253, 0.45) !important",
              },
            }),
          ]}
          onChange={(value) => onUpdate({ content: value, dirty: true })}
          onUpdate={updateSelectionToolbar}
          onBlur={() => {
            window.setTimeout(() => setToolbar(null), 150);
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            bracketMatching: true,
          }}
          className="h-full [&_.cm-editor]:h-full"
        />

        {toolbar ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleAddToChat}
            className="absolute z-20 flex items-center gap-1.5 rounded-lg border border-violet-500/50 bg-[#1e1e2e] px-2.5 py-1.5 text-[11px] font-medium text-violet-100 shadow-lg shadow-black/40 transition-colors hover:bg-violet-600/30"
            style={{ top: toolbar.top, left: Math.max(8, toolbar.left) }}
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Sohbete ekle
            <span className="font-mono text-violet-300/80">
              {toolbar.lineStart === toolbar.lineEnd
                ? toolbar.lineStart
                : `${toolbar.lineStart}–${toolbar.lineEnd}`}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

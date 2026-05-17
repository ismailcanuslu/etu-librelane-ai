"use client";

import { useEffect, useRef, useState } from "react";
import { Save, Eye, FileCode2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTab } from "@/lib/types";
import { FileAPI } from "@/lib/api";
import MarkdownContent from "@/components/chat/MarkdownContent";

const LINE_NUMBERS_WIDTH = 48;

type ViewMode = "raw" | "preview";

function lineCount(text: string) {
  return text.split("\n").length;
}

interface MarkdownEditorPaneProps {
  tab: FileTab;
  onUpdate: (patch: Partial<FileTab>) => void;
}

export default function MarkdownEditorPane({ tab, onUpdate }: MarkdownEditorPaneProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
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
        new Blob([content], { type: "text/markdown" }),
        "text/markdown"
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
        if (viewMode !== "raw") return;
        const active = document.activeElement;
        if (!active || active === textareaRef.current || active === document.body) {
          e.preventDefault();
          handleSave();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const lines = lineCount(tab.content);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-white/8 bg-[#0d1117] px-3 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                viewMode === "raw"
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <FileCode2 className="h-3 w-3" />
              Ham metin
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                viewMode === "preview"
                  ? "bg-violet-600 text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Eye className="h-3 w-3" />
              Önizleme
            </button>
          </div>
          <span className="truncate font-mono text-[10px] text-slate-600">{tab.key}</span>
          {tab.dirty && <span className="flex-shrink-0 text-[10px] text-amber-400">● Kaydedilmedi</span>}
        </div>
        {viewMode === "raw" && (
          <button
            type="button"
            onClick={handleSave}
            disabled={!tab.dirty}
            className={cn(
              "flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              tab.dirty
                ? "bg-violet-600 text-white hover:bg-violet-500"
                : "bg-white/5 text-slate-600 cursor-default"
            )}
            title="Kaydet (Ctrl+S)"
          >
            <Save className="h-3 w-3" />
            Kaydet
          </button>
        )}
      </div>

      {viewMode === "raw" ? (
        <div className="flex flex-1 overflow-hidden font-mono text-xs">
          <div
            ref={linesRef}
            className="select-none overflow-hidden bg-[#0a0f16] text-right text-slate-600"
            style={{ width: LINE_NUMBERS_WIDTH, paddingTop: "12px", paddingRight: "10px" }}
            aria-hidden
          >
            {Array.from({ length: lines }, (_, i) => (
              <div key={i} className="leading-5">
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            value={tab.content}
            onChange={(e) => onUpdate({ content: e.target.value, dirty: true })}
            onScroll={handleScroll}
            spellCheck={false}
            className="flex-1 resize-none bg-[#0d1117] p-3 pl-2 leading-5 text-slate-200 outline-none"
            style={{ tabSize: 2 }}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#161b22] px-6 py-5">
          <p className="mb-3 text-[10px] text-slate-500">
            Salt okunur önizleme — düzenlemek için Ham metin sekmesine geçin.
          </p>
          <MarkdownContent content={tab.content || "_Boş dosya_"} />
        </div>
      )}
    </div>
  );
}

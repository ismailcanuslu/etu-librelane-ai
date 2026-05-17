"use client";

import { useMemo } from "react";
import { computeLineDiff, diffSummary, type DiffLine } from "@/lib/text-diff";
import { cn } from "@/lib/utils";

interface DiffViewerProps {
  oldText: string;
  newText: string;
  className?: string;
  maxHeightClass?: string;
}

function DiffRow({ line }: { line: DiffLine }) {
  const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
  return (
    <div
      className={cn(
        "flex font-mono text-[11px] leading-5",
        line.type === "remove" && "bg-rose-500/15 text-rose-100",
        line.type === "add" && "bg-emerald-500/15 text-emerald-100",
        line.type === "same" && "text-slate-500"
      )}
    >
      <span className="w-5 flex-shrink-0 select-none pl-1 opacity-60">{prefix}</span>
      <pre className="min-w-0 flex-1 whitespace-pre-wrap break-all pr-2">{line.text || " "}</pre>
    </div>
  );
}


export default function DiffViewer({
  oldText,
  newText,
  className,
  maxHeightClass = "max-h-56",
}: DiffViewerProps) {
  const lines = useMemo(() => computeLineDiff(oldText, newText), [oldText, newText]);
  const summary = useMemo(() => diffSummary(lines), [lines]);

  if (lines.length === 0) {
    return <p className="text-[11px] text-slate-500">Değişiklik yok.</p>;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <p className="mb-1.5 text-[10px] text-slate-500">
        <span className="text-emerald-400">+{summary.added}</span>
        {" · "}
        <span className="text-rose-400">−{summary.removed}</span>
        {" satır"}
      </p>
      <div
        className={cn(
          "overflow-auto rounded border border-white/10 bg-[#0a0f16]",
          maxHeightClass
        )}
      >
        {lines.map((line, idx) => (
          <DiffRow key={idx} line={line} />
        ))}
      </div>
    </div>
  );
}

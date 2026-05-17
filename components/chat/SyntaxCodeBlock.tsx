"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { highlightCode, languageDisplayLabel } from "@/lib/syntax-highlight";
import CopyTextButton from "./CopyTextButton";

interface SyntaxCodeBlockProps {
  code: string;
  language?: string | null;
  className?: string;
}

export default function SyntaxCodeBlock({ code, language, className }: SyntaxCodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const label = languageDisplayLabel(language);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    void highlightCode(code, language).then((next) => {
      if (!cancelled) setHtml(next);
    });
    return () => {
      cancelled = true;
    };
  }, [code, language]);

  return (
    <div className={cn("group relative my-2 max-w-full", className)}>
      <div className="flex items-center justify-between gap-2 rounded-t-lg border border-b-0 border-white/10 bg-[#161b22] px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-sky-400/90">{label}</span>
        <CopyTextButton text={code} label="Kopyala" copiedLabel="Kopyalandı" />
      </div>
      {html ? (
        <div
          className={cn(
            "shiki-wrap max-w-full overflow-x-auto rounded-b-lg border border-white/10 bg-[#0d1117] p-3",
            "[&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0",
            "[&_code]:font-mono [&_code]:text-[11px] [&_code]:leading-relaxed"
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-b-lg border border-white/10 bg-[#0d1117] p-3 font-mono text-[11px] leading-relaxed text-slate-300">
          {code}
        </pre>
      )}
    </div>
  );
}

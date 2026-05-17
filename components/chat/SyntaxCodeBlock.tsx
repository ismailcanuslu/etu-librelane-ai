"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { highlightCode, languageDisplayLabel } from "@/lib/syntax-highlight";

interface SyntaxCodeBlockProps {
  code: string;
  language?: string | null;
  className?: string;
}

export default function SyntaxCodeBlock({ code, language, className }: SyntaxCodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  const onCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard izni yok
    }
  }, [code]);

  return (
    <div className={cn("group relative my-2 max-w-full", className)}>
      <div className="flex items-center justify-between gap-2 rounded-t-lg border border-b-0 border-white/10 bg-[#161b22] px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-sky-400/90">{label}</span>
        <button
          type="button"
          onClick={() => void onCopy()}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
          aria-label="Kodu kopyala"
          title="Kopyala"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400/90">Kopyalandı</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span className="hidden sm:inline">Kopyala</span>
            </>
          )}
        </button>
      </div>
      <div
        className={cn(
          "shiki-wrap max-w-full overflow-x-auto rounded-b-lg border border-white/10 bg-[#0d1117] p-3",
          "[&_pre]:!m-0 [&_pre]:!bg-transparent [&_pre]:!p-0",
          "[&_code]:font-mono [&_code]:text-[11px] [&_code]:leading-relaxed",
          !html && "whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-300"
        )}
        dangerouslySetInnerHTML={html ? { __html: html } : undefined}
      >
        {!html ? code : null}
      </div>
    </div>
  );
}

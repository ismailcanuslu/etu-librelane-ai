"use client";

import { useCallback, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
  /** Düşünce bloğu için daha kompakt tipografi */
  variant?: "default" | "thinking";
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }
  return "";
}

function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const code = extractText(children).replace(/\n$/, "");

  const onCopy = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard izni yoksa sessizce gec
    }
  }, [code]);

  return (
    <div className="group relative my-2 max-w-full">
      <div className="flex items-center justify-between gap-2 rounded-t-lg border border-b-0 border-white/10 bg-[#161b22] px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Kod</span>
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
      <pre
        className={cn(
          "max-w-full overflow-x-auto rounded-b-lg border border-white/10 bg-[#0d1117] p-3",
          "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
          className
        )}
      >
        {children}
      </pre>
    </div>
  );
}

export default function MarkdownContent({
  content,
  className,
  variant = "default",
}: MarkdownContentProps) {
  const isThinking = variant === "thinking";

  return (
    <div
      className={cn(
        "min-w-0 max-w-full break-words [overflow-wrap:anywhere]",
        isThinking ? "text-[12px] leading-relaxed text-slate-100" : "text-sm leading-relaxed text-slate-200",
        "[&_p]:mb-2 [&_p:last-child]:mb-0",
        "[&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-4",
        "[&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-4",
        "[&_li]:mb-0.5",
        "[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-slate-100",
        "[&_h2]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-slate-100",
        "[&_h3]:mb-1.5 [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-slate-200",
        "[&_strong]:font-semibold [&_strong]:text-slate-100",
        "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[11px]",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-violet-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-slate-300",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 underline hover:text-violet-200"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownContentProps {
  content: string;
  className?: string;
  /** Düşünce bloğu için daha kompakt tipografi */
  variant?: "default" | "thinking";
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
        "[&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-[#0d1117] [&_pre]:p-3",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-violet-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-slate-300",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => (
            <pre className="whitespace-pre-wrap">{children}</pre>
          ),
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

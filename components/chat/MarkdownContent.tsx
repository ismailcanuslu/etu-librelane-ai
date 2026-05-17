"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import SyntaxCodeBlock from "./SyntaxCodeBlock";

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

function parseFenceFromCodeChild(children: ReactNode): { code: string; language: string | null } {
  if (!isValidElement(children)) {
    return { code: extractText(children).replace(/\n$/, ""), language: null };
  }
  const props = children.props as { className?: string; children?: ReactNode };
  const className = props.className ?? "";
  const match = /language-([\w+-]+)/.exec(className);
  return {
    code: extractText(props.children).replace(/\n$/, ""),
    language: match?.[1] ?? null,
  };
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
          pre: ({ children }) => {
            const { code, language } = parseFenceFromCodeChild(children);
            if (!code) {
              return (
                <pre className="my-2 overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-3 text-[11px]">
                  {children}
                </pre>
              );
            }
            return <SyntaxCodeBlock code={code} language={language} />;
          },
          code: ({ className: codeClass, children, ...props }) => {
            const isFence = /language-/.test(codeClass ?? "");
            if (isFence) {
              return (
                <code className={codeClass} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={codeClass} {...props}>
                {children}
              </code>
            );
          },
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

"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { markdownProseRoot, md } from "@/lib/markdown-prose";
import type { MarkdownVariant } from "@/lib/markdown-prose";
import { normalizeMarkdownDisplay } from "@/lib/normalize-markdown";
import SyntaxCodeBlock from "./SyntaxCodeBlock";

interface MarkdownContentProps {
  content: string;
  className?: string;
  variant?: MarkdownVariant;
  /** false: ham metin (editor senkron) */
  normalize?: boolean;
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

const markdownComponents: Components = {
  p: ({ children }) => <p className={md.p}>{children}</p>,
  h1: ({ children }) => <h1 className={md.h1}>{children}</h1>,
  h2: ({ children }) => <h2 className={md.h2}>{children}</h2>,
  h3: ({ children }) => <h3 className={md.h3}>{children}</h3>,
  h4: ({ children }) => <h4 className={md.h4}>{children}</h4>,
  h5: ({ children }) => <h5 className={md.h5}>{children}</h5>,
  h6: ({ children }) => <h6 className={md.h6}>{children}</h6>,
  ul: ({ children, className }) => (
    <ul className={cn(md.ul, className?.includes("contains-task-list") && md.taskList)}>
      {children}
    </ul>
  ),
  ol: ({ children }) => <ol className={md.ol}>{children}</ol>,
  li: ({ children, className }) => (
    <li className={cn(md.li, className?.includes("task-list-item") && "list-none pl-0")}>
      {children}
    </li>
  ),
  blockquote: ({ children }) => <blockquote className={md.blockquote}>{children}</blockquote>,
  hr: () => <hr className={md.hr} />,
  strong: ({ children }) => <strong className={md.strong}>{children}</strong>,
  em: ({ children }) => <em className={md.em}>{children}</em>,
  del: ({ children }) => <del className={md.del}>{children}</del>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src ?? ""} alt={alt ?? ""} className={md.img} loading="lazy" />
  ),
  table: ({ children }) => (
    <div className={md.tableWrap}>
      <table className={md.table}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className={md.thead}>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className={md.tr}>{children}</tr>,
  th: ({ children }) => <th className={md.th}>{children}</th>,
  td: ({ children }) => <td className={md.td}>{children}</td>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={md.a}>
      {children}
    </a>
  ),
  pre: ({ children }) => {
    const { code, language } = parseFenceFromCodeChild(children);
    if (!code) {
      return (
        <pre className="my-4 overflow-x-auto rounded-lg border border-white/10 bg-[#0d1117] p-4 text-[13px] leading-relaxed">
          {children}
        </pre>
      );
    }
    return (
      <div className="my-4">
        <SyntaxCodeBlock code={code} language={language} />
      </div>
    );
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
      <code className={cn(md.inlineCode, codeClass)} {...props}>
        {children}
      </code>
    );
  },
  input: ({ type, checked, disabled }) => {
    if (type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          readOnly
          className="mt-1.5 h-4 w-4 flex-shrink-0 rounded border-white/20 accent-violet-500"
        />
      );
    }
    return <input type={type} checked={checked} disabled={disabled} readOnly />;
  },
};

export default function MarkdownContent({
  content,
  className,
  variant = "default",
  normalize = true,
}: MarkdownContentProps) {
  const source = normalize ? normalizeMarkdownDisplay(content) : content;

  return (
    <div className={cn(markdownProseRoot(variant), className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

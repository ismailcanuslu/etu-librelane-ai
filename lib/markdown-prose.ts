import { cn } from "@/lib/utils";

export type MarkdownVariant = "default" | "thinking" | "document";

/** Kök sarmalayıcı — GitHub Primer / github-markdown dark benzeri ritim */
export function markdownProseRoot(variant: MarkdownVariant = "default"): string {
  const isThinking = variant === "thinking";
  const isDocument = variant === "document";

  return cn(
    "markdown-body min-w-0 max-w-full break-words [overflow-wrap:anywhere]",
    "text-slate-300 antialiased",
    isDocument && "mx-auto max-w-3xl text-[16px] leading-[1.7]",
    !isDocument && isThinking && "text-[13px] leading-[1.65]",
    !isDocument && !isThinking && "text-[15px] leading-[1.7]",
    "[&>*:first-child]:mt-0",
    "[&>*:last-child]:mb-0"
  );
}

export const md = {
  p: "mb-4 leading-[1.7] text-inherit last:mb-0",
  h1: "mb-4 mt-8 border-b border-white/10 pb-3 text-2xl font-semibold tracking-tight text-slate-50 first:mt-0",
  h2: "mb-4 mt-8 border-b border-white/10 pb-2 text-xl font-semibold tracking-tight text-slate-50 first:mt-0",
  h3: "mb-3 mt-6 text-lg font-semibold text-slate-100 first:mt-0",
  h4: "mb-2 mt-5 text-base font-semibold text-slate-100 first:mt-0",
  h5: "mb-2 mt-4 text-sm font-semibold text-slate-200 first:mt-0",
  h6: "mb-2 mt-4 text-sm font-medium text-slate-400 first:mt-0",
  ul: "mb-4 list-disc space-y-2 pl-7 text-inherit marker:text-slate-500",
  ol: "mb-4 list-decimal space-y-2 pl-7 text-inherit marker:text-slate-400",
  li: "leading-[1.7] [&>p]:mb-2 [&>p:last-child]:mb-0",
  blockquote:
    "mb-4 border-l-4 border-[#3d444d] bg-white/[0.03] py-1 pl-4 pr-2 text-slate-400 [&>p]:mb-2 [&>p:last-child]:mb-0",
  hr: "my-8 border-0 border-t border-white/10",
  a: "font-medium text-[#4493f8] underline decoration-[#4493f8]/40 underline-offset-2 hover:text-[#79b8ff] hover:decoration-[#79b8ff]",
  strong: "font-semibold text-slate-100",
  em: "italic text-slate-200",
  del: "text-slate-500 line-through",
  inlineCode:
    "rounded-md bg-[#6e768166] px-1.5 py-0.5 font-mono text-[0.9em] text-slate-100 before:content-none after:content-none",
  tableWrap: "mb-4 overflow-x-auto rounded-lg border border-white/10",
  table: "w-full border-collapse text-left text-[14px]",
  thead: "bg-white/[0.04]",
  th: "border border-white/10 px-3 py-2 font-semibold text-slate-200",
  td: "border border-white/10 px-3 py-2 align-top text-slate-300",
  tr: "even:bg-white/[0.02]",
  img: "my-4 max-w-full rounded-lg border border-white/10 bg-white/5",
  taskList: "list-none pl-0 [&>li]:flex [&>li]:items-start [&>li]:gap-2",
} as const;

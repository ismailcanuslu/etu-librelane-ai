"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/copy-to-clipboard";
import { cn } from "@/lib/utils";

const COPIED_MS = 3000;

interface CopyTextButtonProps {
  text: string;
  className?: string;
  label?: string;
  copiedLabel?: string;
  variant?: "default" | "compact" | "icon";
}

export default function CopyTextButton({
  text,
  className,
  label = "Kopyala",
  copiedLabel = "Kopyalandı",
  variant = "default",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await copyToClipboard(text);
      if (!ok) return;
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_MS);
    },
    [text]
  );

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={(e) => void onCopy(e)}
        className={cn(
          "rounded-md p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200",
          className
        )}
        aria-label={copied ? copiedLabel : label}
        title={copied ? copiedLabel : label}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => void onCopy(e)}
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors",
        "text-slate-400 hover:bg-white/10 hover:text-slate-200",
        variant === "compact" && "px-1.5 py-0.5",
        className
      )}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400/90">{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {variant === "default" ? <span className="hidden sm:inline">{label}</span> : null}
        </>
      )}
    </button>
  );
}

"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadWorkspaceFile } from "@/lib/download-workspace-file";

export default function DownloadFileButton({
  projectId,
  fileKey,
  fileName,
  className,
  title = "İndir",
}: {
  projectId: string;
  fileKey: string;
  fileName?: string;
  className?: string;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        void (async () => {
          setBusy(true);
          try {
            await downloadWorkspaceFile(projectId, fileKey, fileName);
          } catch (err) {
            console.error("download failed", err);
          } finally {
            setBusy(false);
          }
        })();
      }}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded text-slate-600 transition-colors",
        "hover:text-sky-400 disabled:opacity-50",
        className
      )}
    >
      {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Download className="h-2.5 w-2.5" />}
    </button>
  );
}

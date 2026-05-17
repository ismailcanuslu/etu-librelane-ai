"use client";

import { Check, FilePen, X, FileText } from "lucide-react";
import type { PendingPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlanApprovalBarProps {
  pending: PendingPlan;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
  busy?: boolean;
}

export default function PlanApprovalBar({
  pending,
  onApprove,
  onEdit,
  onReject,
  busy = false,
}: PlanApprovalBarProps) {
  return (
    <div className="flex-shrink-0 border-t border-amber-500/25 bg-amber-500/[0.08] px-3 py-2.5">
      <div className="mb-2 flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-amber-100">Plan onay bekliyor</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-amber-200/70">{pending.planKey}</p>
          <p className="mt-1 text-[10px] text-amber-200/60">
            Plan <span className="font-medium">{pending.planName}</span> çalışma alanına kaydedildi.
            Düzenleyip kaydedebilir, onaylayarak Agent modunda uygulatabilirsiniz.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
            "bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
          )}
        >
          <Check className="h-3.5 w-3.5" />
          Onayla ve uygula
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onEdit}
          className={cn(
            "flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          )}
        >
          <FilePen className="h-3.5 w-3.5" />
          Düzenle
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
          )}
        >
          <X className="h-3.5 w-3.5" />
          Reddet
        </button>
      </div>
    </div>
  );
}
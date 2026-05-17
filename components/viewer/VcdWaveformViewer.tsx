"use client";

import { useEffect, useRef, useMemo } from "react";
import { parseVcd } from "@/lib/vcd-parse";

export default function VcdWaveformViewer({ vcdText }: { vcdText: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parsed = useMemo(() => {
    try {
      return parseVcd(vcdText, 12);
    } catch {
      return null;
    }
  }, [vcdText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsed || parsed.signals.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 640;
    const h = canvas.clientHeight || 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);

    const end = Math.max(parsed.endTime, 1);
    const rowH = Math.min(28, (h - 24) / parsed.signals.length);
    const left = 120;

    parsed.signals.forEach((sig, row) => {
      const y0 = 12 + row * rowH;
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.fillText(sig.name.slice(0, 18), 4, y0 + rowH * 0.65);

      const trans = sig.transitions;
      if (trans.length === 0) return;
      let prevT = 0;
      let prevV = trans[0]?.value ?? "0";
      const drawSeg = (t0: number, t1: number, high: boolean) => {
        const x0 = left + (t0 / end) * (w - left - 8);
        const x1 = left + (t1 / end) * (w - left - 8);
        const yHigh = y0 + 4;
        const yLow = y0 + rowH - 6;
        ctx.strokeStyle = "#a78bfa";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x0, high ? yHigh : yLow);
        ctx.lineTo(x1, high ? yHigh : yLow);
        ctx.stroke();
      };
      for (const tr of trans) {
        drawSeg(prevT, tr.time, prevV === "1");
        prevT = tr.time;
        prevV = tr.value;
      }
      drawSeg(prevT, end, prevV === "1");
    });
  }, [parsed]);

  if (!parsed || parsed.signals.length === 0) {
    return (
      <p className="text-[11px] text-slate-500">VCD ayrıştırılamadı veya sinyal yok.</p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-500">
        Dalga formu önizlemesi ({parsed.signals.length} sinyal, {parsed.endTime}
        {parsed.timescaleUnit})
      </p>
      <canvas ref={canvasRef} className="h-[220px] w-full rounded-lg border border-white/10 bg-[#0d1117]" />
    </div>
  );
}

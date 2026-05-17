"use client";

import { useEffect, useRef, useMemo } from "react";
import { parseGdsBuffer } from "@/lib/gds-parse";

const LAYER_COLORS = [
  "#a78bfa",
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#38bdf8",
  "#fb923c",
];

export default function GdsLayoutViewer({ data }: { data: ArrayBuffer }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parsed = useMemo(() => {
    try {
      return parseGdsBuffer(data, 4000);
    } catch {
      return null;
    }
  }, [data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsed?.bounds) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { minX, minY, maxX, maxY } = parsed.bounds;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 280;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, w, h);

    const pad = 16;
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);

    const tx = (x: number) => pad + (x - minX) * scale;
    const ty = (y: number) => h - pad - (y - minY) * scale;

    parsed.polygons.forEach((poly, idx) => {
      if (poly.points.length < 3) return;
      ctx.fillStyle = LAYER_COLORS[poly.layer % LAYER_COLORS.length] + "55";
      ctx.strokeStyle = LAYER_COLORS[poly.layer % LAYER_COLORS.length];
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(tx(poly.points[0].x), ty(poly.points[0].y));
      for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(tx(poly.points[i].x), ty(poly.points[i].y));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px sans-serif";
    ctx.fillText(`Katmanlar: ${new Set(parsed.polygons.map((p) => p.layer)).size}`, pad, 12);
  }, [parsed]);

  if (!parsed || !parsed.bounds) {
    return <p className="text-[11px] text-slate-500">GDS okunamadı veya boş layout.</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-slate-500">
        Layout önizlemesi ({parsed.polygons.length} poligon) — tam kontrol için KLayout önerilir
      </p>
      <canvas ref={canvasRef} className="h-[280px] w-full rounded-lg border border-white/10 bg-[#0d1117]" />
    </div>
  );
}

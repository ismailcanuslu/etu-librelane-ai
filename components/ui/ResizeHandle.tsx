"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

type ResizeDirection = "horizontal" | "vertical";

interface ResizeHandleProps {
  direction: ResizeDirection;
  onResize: (delta: number) => void;
  className?: string;
  /** Negate pointer delta before calling onResize */
  invert?: boolean;
}

export default function ResizeHandle({
  direction,
  onResize,
  className,
  invert = false,
}: ResizeHandleProps) {
  const dragging = useRef(false);
  const lastPos = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;
      e.currentTarget.setPointerCapture(e.pointerId);
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction]
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const pos = direction === "horizontal" ? e.clientX : e.clientY;
      let delta = pos - lastPos.current;
      lastPos.current = pos;
      if (invert) delta = -delta;
      if (delta !== 0) onResize(delta);
    },
    [direction, invert, onResize]
  );

  return (
    <div
      role="separator"
      aria-orientation={direction === "horizontal" ? "vertical" : "horizontal"}
      tabIndex={0}
      title="Boyutu ayarlamak için sürükleyin"
      className={cn(
        "group z-10 flex-shrink-0 touch-none select-none bg-transparent transition-colors",
        direction === "horizontal"
          ? "w-1 cursor-col-resize hover:bg-violet-500/25 active:bg-violet-500/40"
          : "h-1 cursor-row-resize hover:bg-violet-500/25 active:bg-violet-500/40",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
  );
}

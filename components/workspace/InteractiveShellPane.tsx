"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { hostShellWebSocketUrl } from "@/lib/terminal-shell-client";

interface InteractiveShellPaneProps {
  sessionId: string;
  active: boolean;
  shellCwd?: string;
  onClosed: () => void;
}

export default function InteractiveShellPane({
  sessionId,
  active,
  shellCwd,
  onClosed,
}: InteractiveShellPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onClosedRef = useRef(onClosed);
  const activeRef = useRef(active);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: 12,
      theme: {
        background: "#1a1f26",
        foreground: "#cbd5e1",
        cursor: "#a78bfa",
      },
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();
    terminal.writeln("Kabuk oturumu açılıyor...");

    terminalRef.current = terminal;
    fitRef.current = fitAddon;

    const ws = new WebSocket(hostShellWebSocketUrl(sessionId));
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    const sendResize = () => {
      if (ws.readyState !== WebSocket.OPEN) return;
      fitAddon.fit();
      ws.send(
        JSON.stringify({
          type: "resize",
          rows: terminal.rows,
          cols: terminal.cols,
        })
      );
    };

    ws.onopen = () => {
      terminal.writeln("Bağlandı.");
      if (shellCwd === "/") {
        terminal.writeln("\x1b[90mKök dizin (/). Projeye geçmek için: cd \"$LIBRELANE_PROJECT_DIR\"\x1b[0m");
      }
      sendResize();
    };

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        terminal.write(event.data);
        return;
      }
      const buffer = event.data instanceof ArrayBuffer ? event.data : event.data.buffer;
      terminal.write(new Uint8Array(buffer));
    };

    ws.onerror = () => {
      terminal.writeln("\r\n\x1b[31mKabuk bağlantısı kesildi.\x1b[0m");
    };

    ws.onclose = () => {
      terminal.writeln("\r\n\x1b[33mOturum kapandı.\x1b[0m");
      if (!disposed) onClosedRef.current();
    };

    const dataDisposable = terminal.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!activeRef.current) return;
      sendResize();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      dataDisposable.dispose();
      resizeObserver.disconnect();
      ws.close();
      wsRef.current = null;
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
    };
  }, [sessionId, shellCwd]);

  useEffect(() => {
    if (!active) return;
    fitRef.current?.fit();
    const ws = wsRef.current;
    const terminal = terminalRef.current;
    if (!ws || !terminal || ws.readyState !== WebSocket.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "resize",
        rows: terminal.rows,
        cols: terminal.cols,
      })
    );
  }, [active]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden bg-[#1a1f26] p-1" />;
}
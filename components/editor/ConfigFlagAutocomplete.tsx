"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenlaneConfigCatalog } from "@/lib/openlane-config-catalog-client";
import { cn } from "@/lib/utils";

interface ConfigFlagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  catalog: OpenlaneConfigCatalog | null;
  onSelect: (key: string) => void;
  placeholder?: string;
}

export default function ConfigFlagAutocomplete({
  value,
  onChange,
  suggestions,
  catalog,
  onSelect,
  placeholder = "ör. FI → FILL_INSERTION",
}: ConfigFlagAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions, value]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  function pick(key: string) {
    onSelect(key);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && value.length >= 2 && suggestions.length > 0) {
        setOpen(true);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && suggestions[highlight]) {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && value.length >= 2 && suggestions.length > 0;

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value.toUpperCase();
          onChange(v);
          setOpen(v.length >= 2);
        }}
        onFocus={() => setOpen(value.length >= 2)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded border border-white/10 bg-[#0a0f16] px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none focus:border-violet-500/50"
      />
      {showList && (
        <ul
          ref={listRef}
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-40 overflow-y-auto rounded border border-white/15 bg-[#161b22] shadow-lg"
        >
          {suggestions.map((s, idx) => (
            <li key={s}>
              <button
                type="button"
                className={cn(
                  "flex w-full flex-col items-start px-2 py-1.5 text-left",
                  idx === highlight ? "bg-violet-500/25" : "hover:bg-violet-500/15"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setHighlight(idx)}
              >
                <span className="font-mono text-[11px] text-violet-200">{s}</span>
                <span className="line-clamp-1 text-[10px] text-slate-500">
                  {catalog?.variables[s]?.description_tr}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

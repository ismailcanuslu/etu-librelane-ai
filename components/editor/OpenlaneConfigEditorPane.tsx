"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Save, Settings2, FileCode2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTab } from "@/lib/types";
import { FileAPI } from "@/lib/api";
import {
  configFormatFromKey,
  configToEntries,
  entriesToConfig,
  parseConfigContent,
  parseEditString,
  serializeConfigContent,
  valueToEditString,
  type ConfigEntry,
} from "@/lib/openlane-config-io";
import {
  fetchOpenlaneConfigCatalog,
  getCatalogCategories,
  searchCatalogFlags,
  type OpenlaneConfigCatalog,
} from "@/lib/openlane-config-catalog-client";
import ConfigFlagAutocomplete from "@/components/editor/ConfigFlagAutocomplete";
import ConfigFlagInfoButton from "@/components/editor/ConfigFlagInfoButton";
import ConfigRequiredFlagsBanner from "@/components/editor/ConfigRequiredFlagsBanner";
import { TooltipProvider } from "@/components/ui/Tooltip";

const LINE_NUMBERS_WIDTH = 48;

type ViewMode = "raw" | "wizard";

function lineCount(text: string) {
  return text.split("\n").length;
}

interface OpenlaneConfigEditorPaneProps {
  tab: FileTab;
  onUpdate: (patch: Partial<FileTab>) => void;
}

export default function OpenlaneConfigEditorPane({ tab, onUpdate }: OpenlaneConfigEditorPaneProps) {
  const format = configFormatFromKey(tab.key);
  const [viewMode, setViewMode] = useState<ViewMode>("raw");
  const [catalog, setCatalog] = useState<OpenlaneConfigCatalog | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [entries, setEntries] = useState<ConfigEntry[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [newFlagQuery, setNewFlagQuery] = useState("");
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagValue, setNewFlagValue] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linesRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  useEffect(() => {
    void fetchOpenlaneConfigCatalog()
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const syncEntriesFromContent = useCallback(
    (content: string) => {
      const parsed = parseConfigContent(content, format);
      if (!parsed.ok) {
        setParseError(parsed.error);
        return false;
      }
      setParseError(null);
      setEntries(configToEntries(parsed.data));
      return true;
    },
    [format]
  );

  useEffect(() => {
    if (viewMode === "wizard") syncEntriesFromContent(tab.content);
  }, [viewMode, tab.content, syncEntriesFromContent]);

  const categories = useMemo(
    () => (catalog ? getCatalogCategories(catalog) : []),
    [catalog]
  );

  const suggestions = useMemo(() => {
    if (!catalog || newFlagQuery.trim().length < 2) return [];
    return searchCatalogFlags(catalog, newFlagQuery, newCategory || null);
  }, [catalog, newFlagQuery, newCategory]);

  function pushContentFromEntries(nextEntries: ConfigEntry[]) {
    setEntries(nextEntries);
    const serialized = serializeConfigContent(entriesToConfig(nextEntries), format);
    onUpdate({ content: serialized, dirty: true });
  }

  function handleScroll() {
    if (linesRef.current && textareaRef.current) {
      linesRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  async function handleSave() {
    if (saving.current) return;
    saving.current = true;
    onUpdate({ dirty: false });
    try {
      const { content, bucket, key } = tabRef.current;
      const ct =
        format === "json" ? "application/json" : "application/x-yaml";
      await FileAPI.putObject(bucket, key, new Blob([content], { type: ct }), ct);
    } catch (err) {
      onUpdate({ dirty: true });
      console.error("save failed", err);
    } finally {
      saving.current = false;
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function switchToWizard() {
    if (syncEntriesFromContent(tab.content)) setViewMode("wizard");
  }

  function updateEntryValue(index: number, raw: string) {
    const next = [...entries];
    next[index] = { ...next[index], value: parseEditString(raw) };
    pushContentFromEntries(next);
  }

  function removeEntry(index: number) {
    pushContentFromEntries(entries.filter((_, i) => i !== index));
  }

  function addEntry(key: string, valueRaw?: string, overwrite = false) {
    const k = key.trim();
    if (!k) return;
    const existingIdx = entries.findIndex((e) => e.key === k);
    if (existingIdx >= 0 && !overwrite) {
      const ok = window.confirm(`${k} zaten var. Üzerine yazılsın mı?`);
      if (!ok) return;
    }
    const val = valueRaw !== undefined ? parseEditString(valueRaw) : "";
    const meta = catalog?.variables[k];
    const defaultVal = meta?.default ?? "";
    const parsedVal = val !== "" ? val : parseEditString(defaultVal);
    if (existingIdx >= 0) {
      const next = [...entries];
      next[existingIdx] = { key: k, value: parsedVal };
      pushContentFromEntries(next);
    } else {
      pushContentFromEntries([...entries, { key: k, value: parsedVal }]);
    }
    setNewFlagKey("");
    setNewFlagValue("");
    setNewFlagQuery("");
  }

  function commitNewFlag() {
    const key = newFlagKey.trim() || suggestions[0];
    if (!key) return;
    addEntry(key, newFlagValue);
  }

  const lines = lineCount(tab.content);

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-white/8 bg-[#0d1117] px-3 py-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("raw")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  viewMode === "raw" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <FileCode2 className="h-3 w-3" />
                Ham metin
              </button>
              <button
                type="button"
                onClick={switchToWizard}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  viewMode === "wizard" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                <Settings2 className="h-3 w-3" />
                Config sihirbazı
              </button>
            </div>
            <span className="truncate font-mono text-[10px] text-slate-600">{tab.key}</span>
            {tab.dirty && <span className="text-[10px] text-amber-400">● Kaydedilmedi</span>}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!tab.dirty}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
              tab.dirty ? "bg-violet-600 text-white hover:bg-violet-500" : "bg-white/5 text-slate-600"
            )}
          >
            <Save className="h-3 w-3" />
            Kaydet
          </button>
        </div>

        {viewMode === "raw" ? (
          <div className="flex flex-1 overflow-hidden font-mono text-xs">
            <div
              ref={linesRef}
              className="select-none overflow-hidden bg-[#0a0f16] text-right text-slate-600"
              style={{ width: LINE_NUMBERS_WIDTH, paddingTop: 12, paddingRight: 10 }}
              aria-hidden
            >
              {Array.from({ length: lines }, (_, i) => (
                <div key={i} className="leading-5">
                  {i + 1}
                </div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              value={tab.content}
              onChange={(e) => onUpdate({ content: e.target.value, dirty: true })}
              onScroll={handleScroll}
              spellCheck={false}
              className="flex-1 resize-none bg-[#0d1117] p-3 pl-2 leading-5 text-slate-200 outline-none"
            />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {parseError ? (
              <p className="flex-shrink-0 border-b border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                Sihirbaz için ham metni düzeltin: {parseError}
              </p>
            ) : (
              <ConfigRequiredFlagsBanner
                entries={entries}
                catalog={catalog}
                onAddKey={(k, v) => addEntry(k, v)}
              />
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
              <div className="space-y-1">
                {entries.map((entry, idx) => (
                  <div
                    key={`${entry.key}-${idx}`}
                    className="flex items-start gap-1 rounded border border-white/8 bg-white/[0.03] px-2 py-1.5"
                  >
                    <code className="w-[140px] flex-shrink-0 truncate pt-1 font-mono text-[11px] text-violet-300">
                      {entry.key}
                    </code>
                    <input
                      type="text"
                      value={valueToEditString(entry.value)}
                      onChange={(e) => updateEntryValue(idx, e.target.value)}
                      className="min-w-0 flex-1 rounded border border-white/10 bg-[#0a0f16] px-2 py-1 font-mono text-[11px] text-slate-200 outline-none focus:border-violet-500/50"
                    />
                    <ConfigFlagInfoButton meta={catalog?.variables[entry.key]} />
                    <button
                      type="button"
                      onClick={() => removeEntry(idx)}
                      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
                      title="Sil"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-3">
                <p className="mb-2 text-[11px] font-medium text-slate-300">Yeni bayrak ekle</p>
                <div className="mb-2">
                  <label className="mb-1 block text-[10px] text-slate-500">1. Kategori (isteğe bağlı)</label>
                  <select
                    value={newCategory}
                    onChange={(e) => {
                      setNewCategory(e.target.value);
                      setNewFlagQuery("");
                      setNewFlagKey("");
                    }}
                    className="w-full rounded border border-white/10 bg-[#0a0f16] px-2 py-1.5 text-[11px] text-slate-200 outline-none"
                  >
                    <option value="">Tüm kategoriler</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="mb-1 block text-[10px] text-slate-500">2. Bayrak adı (en az 2 harf)</label>
                  <ConfigFlagAutocomplete
                    value={newFlagKey || newFlagQuery}
                    onChange={(v) => {
                      setNewFlagQuery(v);
                      setNewFlagKey(v);
                    }}
                    suggestions={suggestions}
                    catalog={catalog}
                    onSelect={(s) => {
                      setNewFlagKey(s);
                      setNewFlagQuery(s);
                      const d = catalog?.variables[s]?.default;
                      if (d && !newFlagValue) setNewFlagValue(d);
                    }}
                  />
                </div>
                <div className="mb-2">
                  <label className="mb-1 block text-[10px] text-slate-500">3. Değer</label>
                  <input
                    type="text"
                    value={newFlagValue}
                    onChange={(e) => setNewFlagValue(e.target.value)}
                    placeholder={
                      newFlagKey && catalog?.variables[newFlagKey]?.default
                        ? `Varsayılan: ${catalog.variables[newFlagKey].default}`
                        : "değer"
                    }
                    className="w-full rounded border border-white/10 bg-[#0a0f16] px-2 py-1.5 font-mono text-[11px] text-slate-200 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={commitNewFlag}
                  disabled={!(newFlagKey.trim() || suggestions[0])}
                  className="flex items-center gap-1 rounded-md bg-violet-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ekle ve config&apos;e yaz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

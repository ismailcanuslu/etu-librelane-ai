"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Save, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export type OllamaConfigPayload = {
  base_url: string;
  model: string;
  timeout_seconds: number;
  auto_start: boolean;
  container_name: string;
  host_start_command: string;
  ready_timeout_seconds: number;
};

interface OllamaSettingsEditorProps {
  onDirtyChange: (dirty: boolean) => void;
}

function stableStringify(c: OllamaConfigPayload): string {
  return JSON.stringify(c);
}

export default function OllamaSettingsEditor({ onDirtyChange }: OllamaSettingsEditorProps) {
  const onDirtyRef = useRef(onDirtyChange);
  onDirtyRef.current = onDirtyChange;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [psText, setPsText] = useState<string>("");
  const baselineRef = useRef<string>("");

  const [form, setForm] = useState<OllamaConfigPayload>({
    base_url: "http://127.0.0.1:11434",
    model: "gemma4:26b",
    timeout_seconds: 300,
    auto_start: true,
    container_name: "",
    host_start_command: "",
    ready_timeout_seconds: 60,
  });

  const markDirty = useCallback((next: OllamaConfigPayload) => {
    const dirty = stableStringify(next) !== baselineRef.current;
    onDirtyRef.current(dirty);
  }, []);

  const loadConfig = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/ai/ollama/config", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as Partial<OllamaConfigPayload> & { error?: string };
    if (!res.ok) {
      throw new Error(data.error ?? `Yapılandırma okunamadı (${res.status})`);
    }
    const next: OllamaConfigPayload = {
      base_url: String(data.base_url ?? "http://127.0.0.1:11434"),
      model: String(data.model ?? "gemma4:26b"),
      timeout_seconds: Number(data.timeout_seconds ?? 300),
      auto_start: Boolean(data.auto_start ?? true),
      container_name: String(data.container_name ?? ""),
      host_start_command: String(data.host_start_command ?? ""),
      ready_timeout_seconds: Number(data.ready_timeout_seconds ?? 60),
    };
    return next;
  }, []);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    try {
      const res = await fetch("/api/ai/ollama/models", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { models?: string[]; error?: string };
      if (!res.ok) {
        setModels([]);
        setError(data.error ?? "Model listesi alınamadı");
        return;
      }
      setModels(Array.isArray(data.models) ? data.models : []);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const loadPs = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/ollama/ps", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      setPsText(JSON.stringify(data, null, 2));
    } catch {
      setPsText("{}");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const next = await loadConfig();
        if (cancelled) return;
        setForm(next);
        baselineRef.current = stableStringify(next);
        onDirtyRef.current(false);
        await loadModels();
        await loadPs();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConfig, loadModels, loadPs]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/ollama/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as OllamaConfigPayload & { error?: string; detail?: string };
      if (!res.ok) {
        throw new Error(data.detail ?? data.error ?? `Kayıt başarısız (${res.status})`);
      }
      const next: OllamaConfigPayload = {
        base_url: String(data.base_url),
        model: String(data.model),
        timeout_seconds: Number(data.timeout_seconds),
        auto_start: Boolean(data.auto_start),
        container_name: String(data.container_name ?? ""),
        host_start_command: String(data.host_start_command ?? ""),
        ready_timeout_seconds: Number(data.ready_timeout_seconds),
      };
      setForm(next);
      baselineRef.current = stableStringify(next);
      onDirtyRef.current(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      void loadModels();
      void loadPs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [form, loadModels, loadPs]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSave();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleSave]);

  function patch<K extends keyof OllamaConfigPayload>(key: K, value: OllamaConfigPayload[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      markDirty(next);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#1e1e1e] text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-xs">Ollama ayarları yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-[#1e1e1e]">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
        <div className="flex items-center gap-2 text-slate-300">
          <Server className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-medium">Ollama</span>
          <span className="text-[10px] text-slate-600">JSON dosyasında saklanır · Cmd+S kaydet</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadModels().then(() => loadPs())}
            disabled={modelsLoading}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", modelsLoading && "animate-spin")} />
            Yenile
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={cn(
              "flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              savedFlash
                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                : "bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
            )}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {savedFlash ? "Kaydedildi" : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="grid flex-1 gap-6 p-4 lg:grid-cols-2">
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Ollama host (REST)</label>
            <input
              value={form.base_url}
              onChange={(e) => patch("base_url", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500/50"
              placeholder="http://127.0.0.1:11434"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Model</label>
            <input
              list="ollama-model-suggestions"
              value={form.model}
              onChange={(e) => patch("model", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 outline-none focus:border-violet-500/50"
              placeholder="ör. gemma4:26b"
            />
            <datalist id="ollama-model-suggestions">
              {models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="mt-1 text-[10px] text-slate-600">
              {models.length} yerel model; listede yoksa adı elle yazın.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">İstek zaman aşımı (sn)</label>
              <input
                type="number"
                min={10}
                max={7200}
                value={form.timeout_seconds}
                onChange={(e) => patch("timeout_seconds", Number(e.target.value) || 300)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Hazır bekleme (sn)</label>
              <input
                type="number"
                min={5}
                max={600}
                value={form.ready_timeout_seconds}
                onChange={(e) => patch("ready_timeout_seconds", Number(e.target.value) || 60)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.auto_start}
              onChange={(e) => patch("auto_start", e.target.checked)}
              className="rounded border-white/20 bg-white/5"
            />
            Ollama kapalıysa otomatik başlatmayı dene (host)
          </label>

          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Docker konteyner adı (opsiyonel)</label>
            <input
              value={form.container_name}
              onChange={(e) => patch("container_name", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
              placeholder="boş bırakılabilir"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Özel host başlatma komutu (opsiyonel)</label>
            <textarea
              value={form.host_start_command}
              onChange={(e) => patch("host_start_command", e.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-slate-200 outline-none focus:border-violet-500/50"
              placeholder="Boşsa: nsenter + ollama run &lt;model&gt;"
            />
          </div>
        </div>

        <div className="flex min-h-[280px] flex-col rounded-lg border border-white/8 bg-[#252526]">
          <p className="border-b border-white/8 px-3 py-2 text-[11px] font-medium text-slate-500">ollama ps (çalışan süreçler)</p>
          <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[10px] leading-relaxed text-slate-400">{psText || "—"}</pre>
        </div>
      </div>
    </div>
  );
}

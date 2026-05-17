export interface OpenlaneConfigVariableMeta {
  category: string;
  required: boolean;
  default?: string | null;
  description_en: string;
  description_tr: string;
  value_kind: string;
}

export interface OpenlaneConfigCatalog {
  version?: string;
  generated_at?: string;
  source_url?: string;
  required_keys?: string[];
  scaffold_recommended_keys?: string[];
  categories: Record<string, { label_tr: string }>;
  variables: Record<string, OpenlaneConfigVariableMeta>;
}

let cachedCatalog: OpenlaneConfigCatalog | null = null;

export async function fetchOpenlaneConfigCatalog(): Promise<OpenlaneConfigCatalog> {
  if (cachedCatalog) return cachedCatalog;
  const res = await fetch("/api/tools/openlane-config-catalog", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Katalog yüklenemedi: HTTP ${res.status}`);
  }
  const data = (await res.json()) as OpenlaneConfigCatalog;
  cachedCatalog = data;
  return data;
}

export function searchCatalogFlags(
  catalog: OpenlaneConfigCatalog,
  query: string,
  category: string | null
): string[] {
  const q = query.trim().toUpperCase();
  if (q.length < 2) return [];
  const out: string[] = [];
  for (const [key, meta] of Object.entries(catalog.variables)) {
    if (category && meta.category !== category) continue;
    if (key.startsWith(q)) out.push(key);
  }
  return out.sort().slice(0, 40);
}

export function getCatalogCategories(catalog: OpenlaneConfigCatalog): { id: string; label: string }[] {
  const seen = new Set<string>();
  const list: { id: string; label: string }[] = [];
  for (const [id, cat] of Object.entries(catalog.categories ?? {})) {
    if (id === "required") continue;
    seen.add(id);
    list.push({ id, label: cat.label_tr || id });
  }
  for (const meta of Object.values(catalog.variables)) {
    if (!seen.has(meta.category)) {
      seen.add(meta.category);
      list.push({
        id: meta.category,
        label: catalog.categories[meta.category]?.label_tr ?? meta.category,
      });
    }
  }
  return list.sort((a, b) => a.label.localeCompare(b.label, "tr"));
}

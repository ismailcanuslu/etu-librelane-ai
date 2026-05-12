/**
 * Node/undici `fetch` hatalarında asıl sebep çoğu zaman `error.cause` zincirindedir.
 */

export type UpstreamFetchFailure = {
  message: string;
  /** Tüm zincir: örn. ["fetch failed", "connect ECONNREFUSED 127.0.0.1:8001"] */
  causes: string[];
  /** Örn. ECONNREFUSED, ENOTFOUND */
  code?: string;
  hint: string;
};

function errnoCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return undefined;
}

export function describeUpstreamFetchFailure(err: unknown, upstream: string): UpstreamFetchFailure {
  const causes: string[] = [];
  let code: string | undefined;
  let cur: unknown = err;

  for (let i = 0; i < 12 && cur != null; i++) {
    if (cur instanceof Error) {
      causes.push(cur.message);
      code ??= errnoCode(cur);
      cur = cur.cause;
      continue;
    }
    if (cur && typeof cur === "object") {
      const o = cur as { message?: string; code?: string };
      if (o.message) causes.push(String(o.message));
      if (o.code && !code) code = String(o.code);
    } else {
      causes.push(String(cur));
    }
    break;
  }

  if (!causes.length) causes.push(String(err));

  let hint =
    "Aynı makinede terminalde şunu çalıştır: curl -sS " +
    JSON.stringify(upstream) +
    ". curl çalışıp Next 502 veriyorsa next dev farklı ortamda olabilir (WSL / Dev Container / SSH).";

  if (code === "ECONNREFUSED") {
    hint =
      "ECONNREFUSED: Bu Node sürecinin gördüğü adreste backend (8001) dinlemiyor. " +
      "WSL / uzak container kullanıyorsan 127.0.0.1 senin Linux/container içini gösterir; " +
      "backend host’taysa WORKSPACE_BACKEND’i host IP ile ayarla (WSL: /etc/resolv.conf içindeki nameserver, genelde 172.x).";
  } else if (code === "ENOTFOUND") {
    hint = "ENOTFOUND: Hostname çözülemedi; WORKSPACE_BACKEND URL’sini kontrol et.";
  }

  return {
    message: causes[0] ?? "unknown",
    causes,
    code,
    hint,
  };
}

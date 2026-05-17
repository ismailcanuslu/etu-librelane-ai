/** Basit VCD ayrıştırıcı — GTKWave yerine tarayıcı önizlemesi için */

export type VcdSignal = {
  id: string;
  name: string;
  width: number;
  transitions: { time: number; value: string }[];
};

export type ParsedVcd = {
  timescale: number;
  timescaleUnit: string;
  endTime: number;
  signals: VcdSignal[];
};

export function parseVcd(text: string, maxSignals = 16): ParsedVcd {
  const lines = text.split("\n");
  const signals = new Map<string, VcdSignal>();
  const idToKey = new Map<string, string>();
  let timescale = 1;
  let timescaleUnit = "ns";
  let endTime = 0;
  let currentTime = 0;
  let dateStarted = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("$comment")) continue;
    if (line.startsWith("$timescale")) {
      const m = line.match(/\d+\s*(\w+)/);
      if (m) {
        const n = parseInt(line, 10);
        if (!Number.isNaN(n)) timescale = n;
        timescaleUnit = m[1] ?? "ns";
      }
      continue;
    }
    if (line.startsWith("$enddefinitions")) {
      dateStarted = true;
      continue;
    }
    if (!dateStarted) {
      const varMatch = line.match(/^\$var\s+(\w+)\s+(\d+)\s+(\S+)\s+(.+?)\s*\$$/);
      if (varMatch) {
        const [, , widthStr, id, name] = varMatch;
        const key = id;
        idToKey.set(id, key);
        if (signals.size < maxSignals) {
          signals.set(key, {
            id,
            name: name.trim(),
            width: parseInt(widthStr, 10) || 1,
            transitions: [],
          });
        }
      }
      continue;
    }
    if (line.startsWith("#")) {
      const t = parseInt(line.slice(1), 10);
      if (!Number.isNaN(t)) {
        currentTime = t;
        endTime = Math.max(endTime, t);
      }
      continue;
    }
    const valMatch = line.match(/^([01xXzZ\-bB]+)\s*(\S+)$/);
    if (!valMatch) continue;
    const value = valMatch[1];
    const id = valMatch[2].trim();
    const key = idToKey.get(id);
    if (!key) continue;
    const sig = signals.get(key);
    if (!sig) continue;
    sig.transitions.push({
      time: currentTime,
      value: value.replace(/[^01]/g, "").slice(-1) || "0",
    });
  }

  return {
    timescale,
    timescaleUnit,
    endTime,
    signals: Array.from(signals.values()),
  };
}

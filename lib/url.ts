import { Params } from "./types";

export function clampInt(v: number, min: number, max: number) {
  if (!Number.isFinite(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

function parseNames(raw: string | null): string[] {
  if (!raw) return [];
  // stored as comma-separated, URI-encoded values
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    });
}

function encodeNames(names: string[]) {
  return names.map((s) => encodeURIComponent(s)).join("|");
}

export function parseParams(sp: URLSearchParams): Params {
  const event = sp.get("event") ?? "";
  const scouts = clampInt(Number(sp.get("scouts") ?? "6"), 1, 50);
  const obs = clampInt(Number(sp.get("obs") ?? "3"), 0, 20);
  const spread = clampInt(Number(sp.get("spread") ?? "1"), 0, 10);
  const cap = clampInt(Number(sp.get("cap") ?? "3"), 0, 50);
  const exclude = clampInt(Number(sp.get("exclude") ?? "0"), 0, 9999);
  const seed = Number(sp.get("seed") ?? "0") >>> 0;

  const maxFirstPct = clampInt(Number(sp.get("maxFirst") ?? "45"), 0, 100);
  const minLastPct = clampInt(Number(sp.get("minLast") ?? "65"), 0, 100);
  const minSpanPct = clampInt(Number(sp.get("minSpan") ?? "35"), 0, 100);

  const showAll = sp.get("showAll") === "1";

  const scoutNamesRaw = sp.get("names");
  const scoutNames =
    scoutNamesRaw && scoutNamesRaw.length
      ? scoutNamesRaw.split("|").map(decodeURIComponent)
      : undefined;

return {
  event,
  scouts,
  obs,
  spread,
  cap,
  excludeTeam: exclude > 0 ? exclude : undefined,
  seed,
  maxFirstPct,
  minLastPct,
  minSpanPct,
  showAll,
  scoutNames,
};
}

export function paramsToSearchParams(p: Params) {
  const sp = new URLSearchParams();
  sp.set("event", p.event);
  sp.set("scouts", String(p.scouts));
  sp.set("obs", String(p.obs));
  sp.set("spread", String(p.spread));
  sp.set("cap", String(p.cap));
  sp.set("exclude", String(p.excludeTeam ?? 0));
  sp.set("seed", String(p.seed >>> 0));
  sp.set("showAll", (p.showAll ? "1" : "0"));

  const names = (p.scoutNames ?? []).map((s) => s.trim()).filter(Boolean);
  if (names.length > 0) sp.set("names", encodeNames(names));

  const maxFirstPct = clampInt(Number(p.maxFirstPct ?? 45), 0, 100);
  const minLastPct = clampInt(Number(p.minLastPct ?? 65), 0, 100);
  const minSpanPct = clampInt(Number(p.minSpanPct ?? 35), 0, 100);

  sp.set("maxFirst", String(maxFirstPct));
  sp.set("minLast", String(minLastPct));
  sp.set("minSpan", String(minSpanPct));

  return sp;
}

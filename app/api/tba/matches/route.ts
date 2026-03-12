import { NextResponse } from "next/server";
import type { Match } from "@/lib/types";

type TbaMatchSimple = {
  key: string;
  comp_level: string;
  match_number: number;
  time?: number | null;
  predicted_time?: number | null;
  alliances: {
    red: { team_keys: string[] };
    blue: { team_keys: string[] };
  };
};

function teamKeyToNumber(teamKey: string): number | null {
  if (!teamKey.startsWith("frc")) return null;
  const n = Number(teamKey.slice(3));
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const event = (url.searchParams.get("event") || "").trim();

    if (!event) {
      return NextResponse.json({ error: "Missing event query param" }, { status: 400 });
    }

    const key = process.env.TBA_AUTH_KEY;
    if (!key) {
      return NextResponse.json({ error: "Server missing TBA_AUTH_KEY" }, { status: 500 });
    }

    const userAgent = process.env.APP_USER_AGENT || "TBA-Scout-Assigner/1.0";

    const tbaUrl = `https://www.thebluealliance.com/api/v3/event/${encodeURIComponent(event)}/matches/simple`;

    const r = await fetch(tbaUrl, {
      headers: {
        "X-TBA-Auth-Key": key,
        "User-Agent": userAgent,
      },
      next: { revalidate: 30 },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return NextResponse.json(
        { error: `TBA error ${r.status}`, details: text.slice(0, 500) },
        { status: 502 }
      );
    }

    const raw = (await r.json()) as TbaMatchSimple[];

    const qm = raw
      .filter((m) => m.comp_level === "qm")
      .sort((a, b) => a.match_number - b.match_number)
      .map((m): Match | null => {
        const red = m.alliances.red.team_keys
          .map(teamKeyToNumber)
          .filter((x): x is number => x !== null);

        const blue = m.alliances.blue.team_keys
          .map(teamKeyToNumber)
          .filter((x): x is number => x !== null);

        if (red.length !== 3 || blue.length !== 3) return null;

        return {
          key: m.key,
          matchNumber: m.match_number,
          time: (m.time ?? m.predicted_time ?? null),
          red,
          blue,
        };
      })
      .filter((m): m is Match => m !== null);

    return NextResponse.json({ event, matches: qm });
  } catch (e: any) {
    return NextResponse.json({ error: "Unexpected server error", details: String(e) }, { status: 500 });
  }
}

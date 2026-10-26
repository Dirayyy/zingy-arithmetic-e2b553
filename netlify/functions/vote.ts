import type { Config } from "@netlify/functions";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { duels, mapVotes, results } from "../../db/schema.js";

// Players needed to agree before the puzzle changes
const NEEDED = 2;
// Lead time so both players switch to the new puzzle at the same moment
const SWITCH_DELAY_MS = 4000;

const clean = (v: unknown, max: number) =>
  String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max);

async function state(code: string) {
  await db.insert(duels).values({ code }).onConflictDoNothing();
  const [duel] = await db.select().from(duels).where(eq(duels.code, code));
  const votes = await db
    .select({ player: mapVotes.player })
    .from(mapVotes)
    .where(and(eq(mapVotes.code, code), eq(mapVotes.round, duel.round)));
  const done = await db
    .select({ player: results.player, name: results.name, ms: results.ms })
    .from(results)
    .where(and(eq(results.code, code), eq(results.round, duel.round)));
  return {
    round: duel.round,
    switchAt: duel.switchAt,
    votes: votes.map((v) => v.player),
    results: done,
    needed: NEEDED,
    now: Date.now(),
  };
}

export default async (req: Request) => {
  if (req.method === "GET") {
    const code = clean(new URL(req.url).searchParams.get("code"), 10);
    if (!code) return Response.json({ error: "Missing code" }, { status: 400 });
    return Response.json(await state(code));
  }

  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const code = clean(body.code, 10);
    const player = clean(body.player, 24);
    const round = Number(body.round);
    if (!code || !player || !Number.isInteger(round)) {
      return Response.json({ error: "Missing code, player or round" }, { status: 400 });
    }

    // A finished player posts their time for this puzzle so the other side sees it
    if (body.finish) {
      const ms = Math.round(Number(body.ms));
      if (!Number.isFinite(ms) || ms <= 0 || ms > 2 ** 31 - 1) {
        return Response.json({ error: "Invalid time" }, { status: 400 });
      }
      const name = String(body.name ?? "").replace(/[|<>]/g, "").trim().slice(0, 14) || "Player";
      await db.insert(results).values({ code, round, player, name, ms }).onConflictDoNothing();
      return Response.json(await state(code));
    }

    const cur = await state(code);
    // Votes only count for the puzzle currently being played
    if (round !== cur.round) return Response.json(cur);

    if (body.vote) {
      await db.insert(mapVotes).values({ code, round, player }).onConflictDoNothing();
    } else {
      await db
        .delete(mapVotes)
        .where(and(eq(mapVotes.code, code), eq(mapVotes.round, round), eq(mapVotes.player, player)));
    }

    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(mapVotes)
      .where(and(eq(mapVotes.code, code), eq(mapVotes.round, round)));

    if (n >= NEEDED) {
      // Conditional on round so concurrent votes only advance once
      await db
        .update(duels)
        .set({ round: round + 1, switchAt: Date.now() + SWITCH_DELAY_MS })
        .where(and(eq(duels.code, code), eq(duels.round, round)));
    }
    return Response.json(await state(code));
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/vote",
};

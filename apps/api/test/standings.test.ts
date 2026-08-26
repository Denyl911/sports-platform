import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { matches, stageStandings } from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import type { UserRow } from "./helpers/db";
import {
	seedEdition,
	seedGroup,
	seedMatch,
	seedMember,
	seedRegistration,
	seedSport,
	seedStage,
	seedTeam,
	seedTournament,
	seedUser,
} from "./helpers/db";

const api = treaty(app);

interface Ctx {
	statistician: UserRow;
	tournamentId: string;
	stageId: string;
	groupId: string;
}

let ctx: Ctx;

async function setupGroup(opts: { hasDraws?: boolean } = {}) {
	const statistician = await seedUser({ role: "viewer_staff" });
	const sport = await seedSport(undefined, opts.hasDraws ?? true);
	const tournament = await seedTournament(sport.id);
	const edition = await seedEdition(tournament.id);
	const stage = await seedStage(edition.id);
	const group = await seedGroup(stage.id);
	await seedMember(tournament.id, statistician.id, "statistician");
	return {
		statistician,
		tournamentId: tournament.id,
		stageId: stage.id,
		groupId: group.id,
	};
}

beforeEach(async () => {
	ctx = (await setupGroup()) as typeof ctx;
});

function h(user: UserRow) {
	return authHeaders(user);
}

// Partido finalizado con marcador (y ganador derivado si lo hay)
async function finishedMatch(
	stageId: string,
	groupId: string,
	home: { id: string },
	away: { id: string },
	homeScore: number,
	awayScore: number,
) {
	await seedRegistration(stageId, home.id);
	await seedRegistration(stageId, away.id);
	const match = await seedMatch(stageId, {
		groupId,
		homeTeamId: home.id,
		awayTeamId: away.id,
		status: "finished",
	});
	const winner =
		homeScore > awayScore ? home.id : awayScore > homeScore ? away.id : null;
	await db
		.update(matches)
		.set({ homeScore, awayScore, winnerTeamId: winner })
		.where(eq(matches.id, match.id));
	return match;
}

describe("standings", () => {
	it("recalc asigna rankPosition y ordena por puntos", async () => {
		// A: 2W (6 pts), B: 1W 1L (3), C: 2L (0)
		const a = await seedTeam("A");
		const b = await seedTeam("B");
		const c = await seedTeam("C");

		await finishedMatch(ctx.stageId, ctx.groupId, a, b, 3, 1);
		await finishedMatch(ctx.stageId, ctx.groupId, a, c, 3, 1);
		await finishedMatch(ctx.stageId, ctx.groupId, b, c, 2, 0);

		const recalc = await api
			.groups({ groupId: ctx.groupId })
			.standings.recalculate.post(undefined, {
				headers: await h(ctx.statistician),
			});
		expect(recalc.status).toBe(200);
		if (!recalc.data) throw new Error("no data");

		const rows = recalc.data;
		expect(rows).toHaveLength(3);
		expect(rows.map((r) => r.teamId)).toEqual([a.id, b.id, c.id]);
		expect(rows.map((r) => r.rankPosition)).toEqual([1, 2, 3]);
		expect(rows[0]?.points).toBe(6);
		expect(rows[0]?.scoreDifference).toBe(4);
	});

	it("desempate por diferencia de goles a igualdad de puntos", async () => {
		const a = await seedTeam("A");
		const b = await seedTeam("B");
		const c = await seedTeam("C");
		const d = await seedTeam("D");

		await finishedMatch(ctx.stageId, ctx.groupId, a, c, 3, 1); // A +2
		await finishedMatch(ctx.stageId, ctx.groupId, b, d, 2, 1); // B +1

		await api
			.groups({ groupId: ctx.groupId })
			.standings.recalculate.post(undefined, {
				headers: await h(ctx.statistician),
			});

		const standings = await api
			.groups({ groupId: ctx.groupId })
			.standings.get();
		if (!standings.data) throw new Error("no data");
		const order = standings.data.items.map((r) => r.standing.teamId);
		expect(order.indexOf(a.id)).toBeLessThan(order.indexOf(b.id));
		expect(standings.data.items[0]?.standing.rankPosition).toBe(1);
		expect(standings.data.total).toBe(4);
	});

	it("deporte sin empates: partido sin winner no otorga puntos", async () => {
		const alt = await setupGroup({ hasDraws: false });

		const a = await seedTeam("A");
		const b = await seedTeam("B");
		const drawMatch = await seedMatch(alt.stageId, {
			groupId: alt.groupId,
			homeTeamId: a.id,
			awayTeamId: b.id,
			status: "finished",
		});
		// Empate sin winner en deporte hasDraws=false
		await db
			.update(matches)
			.set({ homeScore: 1, awayScore: 1 })
			.where(eq(matches.id, drawMatch.id));

		await api
			.groups({ groupId: alt.groupId })
			.standings.recalculate.post(undefined, {
				headers: await h(alt.statistician),
			});

		const rows = await db
			.select()
			.from(stageStandings)
			.where(eq(stageStandings.groupId, alt.groupId));
		expect(rows.every((r) => r.points === 0)).toBe(true);
		expect(rows.every((r) => r.played === 1)).toBe(true);
	});

	it("ajuste manual se sobreescribe en el siguiente recálculo", async () => {
		const a = await seedTeam("A");
		const b = await seedTeam("B");
		await finishedMatch(ctx.stageId, ctx.groupId, a, b, 2, 1);

		await api
			.groups({ groupId: ctx.groupId })
			.standings.recalculate.post(undefined, {
				headers: await h(ctx.statistician),
			});

		const [row] = await db
			.select()
			.from(stageStandings)
			.where(eq(stageStandings.teamId, a.id))
			.limit(1);
		if (!row) throw new Error("no row");

		const patch = await api
			.standings({ id: row.id })
			.patch({ points: 99 }, { headers: await h(ctx.statistician) });
		expect(patch.status).toBe(200);
		expect(patch.data?.points).toBe(99);

		await api
			.groups({ groupId: ctx.groupId })
			.standings.recalculate.post(undefined, {
				headers: await h(ctx.statistician),
			});

		const [after] = await db
			.select()
			.from(stageStandings)
			.where(eq(stageStandings.id, row.id))
			.limit(1);
		// El ajuste manual (99) fue pisado por el valor real del partido (ganó: 3 pts)
		expect(after?.points).toBe(3);
	});

	it("grupo inexistente → 404", async () => {
		const ghost = crypto.randomUUID();
		const response = await app.handle(
			new Request(`http://localhost/groups/${ghost}/standings`),
		);
		expect(response.status).toBe(404);
	});
});

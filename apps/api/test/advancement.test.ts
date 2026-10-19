import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { matches } from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import type { UserRow } from "./helpers/db";
import {
	resetDb,
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

function h(user: UserRow) {
	return authHeaders(user);
}

// Partido finalizado con marcador (ganador derivado si no hay empate).
async function finishedMatch(
	stageId: string,
	groupId: string,
	home: { id: string },
	away: { id: string },
	homeScore: number,
	awayScore: number,
) {
	await seedRegistration(stageId, home.id, groupId);
	await seedRegistration(stageId, away.id, groupId);
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

describe("avance - previa de clasificados", () => {
	let organizer: UserRow;
	let stageId: string;
	let groupId: string;

	beforeEach(async () => {
		await resetDb();
		organizer = await seedUser({ role: "organizer" });
		const sport = await seedSport();
		const tournament = await seedTournament(sport.id);
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		stageId = stage.id;
		const group = await seedGroup(stage.id);
		groupId = group.id;
		await seedMember(tournament.id, organizer.id, "organizer");
		// La regla vive en la etapa: 2 por grupo.
		const patched = await api.tournaments
			.stages({ stageId })
			.patch({ advancementRules: { qualifyPerGroup: 2 } } as never, {
				headers: await h(organizer),
			});
		expect(patched.status).toBe(200);
	});

	it("una etapa sin regla no marca a nadie como clasificado", async () => {
		// Sobrescribir la regla a vacío vía un stage nuevo sin regla.
		const sport = await seedSport();
		const tournament = await seedTournament(sport.id);
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const group = await seedGroup(stage.id);
		const a = await seedTeam("A");
		const b = await seedTeam("B");
		await finishedMatch(stage.id, group.id, a, b, 3, 1);
		await api
			.groups({ groupId: group.id })
			.standings.recalculate.post(undefined, { headers: await h(organizer) });

		const res = await api.stages({ stageId: stage.id }).qualifiers.get();
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("no data");
		expect(res.data.rule).toBeNull();
		expect(res.data.items.every((i) => i.qualified === false)).toBe(true);
		// Las posiciones se asignan aunque no haya regla.
		expect(res.data.items).toHaveLength(2);
		expect(res.data.items[0]!.position).toBe(1);
	});

	it("con 2 por grupo, los dos primeros quedan clasificados", async () => {
		const a = await seedTeam("A");
		const b = await seedTeam("B");
		const c = await seedTeam("C");
		await finishedMatch(stageId, groupId, a, b, 3, 1);
		await finishedMatch(stageId, groupId, a, c, 3, 1);
		await finishedMatch(stageId, groupId, b, c, 2, 0);
		await api.groups({ groupId }).standings.recalculate.post(undefined, {
			headers: await h(organizer),
		});

		const res = await api.stages({ stageId }).qualifiers.get();
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("no data");
		expect(res.data.rule?.qualifyPerGroup).toBe(2);
		const qualified = res.data.items.filter((i) => i.qualified);
		expect(qualified).toHaveLength(2);
		// El primer clasificado es el líder.
		expect(qualified[0]!.team.name).toBe(a.name);
	});

	it("un equipo sin partidos aparece en la previa con su posición", async () => {
		const a = await seedTeam("A");
		const b = await seedTeam("B");
		const idle = await seedTeam("Idle");
		await seedRegistration(stageId, idle.id, groupId);
		await finishedMatch(stageId, groupId, a, b, 1, 0);
		await api.groups({ groupId }).standings.recalculate.post(undefined, {
			headers: await h(organizer),
		});

		const res = await api.stages({ stageId }).qualifiers.get();
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("no data");
		// Un equipo sin partidos aparece igual (leftJoin): su posición se
		// asigna por el orden de la tabla. Con 0 puntos y diferencia 0, queda
		// por encima de un equipo que perdió (diferencia negativa), así que
		// acá es el 2.º y, con 2 por grupo, clasifica.
		const idleRow = res.data.items.find((i) => i.team.name === idle.name)!;
		expect(idleRow.position).toBe(2);
		expect(idleRow.qualified).toBe(true);
	});

	it("una etapa inexistente responde 404", async () => {
		const res = await api
			.stages({ stageId: "00000000-0000-0000-0000-000000000000" })
			.qualifiers.get();
		expect(res.status).toBe(404);
	});
});

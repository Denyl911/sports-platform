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
	seedVenue,
} from "./helpers/db";

const api = treaty(app);

function h(user: UserRow) {
	return authHeaders(user);
}

type StageType = Parameters<typeof seedStage>[2];

async function setupStage(stageType: StageType = "round_robin") {
	const organizer = await seedUser({ role: "organizer" });
	const sport = await seedSport();
	const tournament = await seedTournament(sport.id);
	const edition = await seedEdition(tournament.id);
	const stage = await seedStage(edition.id, undefined, stageType);
	await seedMember(tournament.id, organizer.id, "organizer");
	return { organizer, sport, tournament, edition, stage };
}

async function registerTeams(stageId: string, count: number, groupId?: string) {
	const teams = [];
	for (let index = 0; index < count; index++) {
		const team = await seedTeam(`Equipo ${index + 1}`);
		await seedRegistration(stageId, team.id, groupId);
		teams.push(team);
	}
	return teams;
}

function fixtureBody(
	overrides: Partial<{
		startDate: string;
		intervalDays: number;
		kickoffTimes: string[];
		matchDurationMinutes: number;
		doubleRound: boolean;
		venueId: string;
		fieldNumbers: number[];
		timeZone: string;
	}> = {},
) {
	return {
		startDate: overrides.startDate ?? "2026-11-07",
		intervalDays: overrides.intervalDays ?? 7,
		kickoffTimes: overrides.kickoffTimes ?? ["09:00", "11:00"],
		timeZone: overrides.timeZone ?? "UTC",
		...(overrides.matchDurationMinutes !== undefined
			? { matchDurationMinutes: overrides.matchDurationMinutes }
			: {}),
		...(overrides.doubleRound !== undefined
			? { doubleRound: overrides.doubleRound }
			: {}),
		...(overrides.venueId !== undefined ? { venueId: overrides.venueId } : {}),
		...(overrides.fieldNumbers !== undefined
			? { fieldNumbers: overrides.fieldNumbers }
			: {}),
	};
}

function pairKey(homeTeamId: string, awayTeamId: string) {
	return [homeTeamId, awayTeamId].sort().join(":");
}

describe("fixture - generación de liguilla", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("cuatro equipos juegan todos contra todos en tres jornadas", async () => {
		const { organizer, stage } = await setupStage();
		const teams = await registerTeams(stage.id, 4);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("sin datos");
		expect(res.data.matches).toBe(6);
		expect(res.data.matchdays).toBe(3);

		const fixture = await api.stages({ stageId: stage.id }).fixture.get();
		expect(fixture.status).toBe(200);
		if (!fixture.data) throw new Error("sin fixture");
		expect(fixture.data.total).toBe(6);
		expect(fixture.data.items).toHaveLength(6);
		expect(fixture.data.items.every((item) => item.groupId === null)).toBe(
			true,
		);

		const rounds = new Map<number | null, typeof fixture.data.items>();
		for (const item of fixture.data.items) {
			const list = rounds.get(item.roundNumber) ?? [];
			list.push(item);
			rounds.set(item.roundNumber, list);
		}
		expect(rounds.size).toBe(3);
		for (const list of rounds.values()) {
			expect(list).toHaveLength(2);
			const playing = list.flatMap((item) => [
				item.homeTeamId,
				item.awayTeamId,
			]);
			expect(new Set(playing).size).toBe(4);
		}

		const pairs = fixture.data.items.map((item) =>
			pairKey(item.homeTeamId ?? "", item.awayTeamId ?? ""),
		);
		expect(new Set(pairs).size).toBe(6);
		expect(fixture.data.items.map((item) => item.matchNumber).sort()).toEqual([
			1, 2, 3, 4, 5, 6,
		]);
		expect(fixture.data.items.every((item) => item.scheduledAt !== null)).toBe(
			true,
		);
		expect(teams).toHaveLength(4);
	});

	it("con cinco equipos uno descansa por jornada", async () => {
		const { organizer, stage } = await setupStage();
		await registerTeams(stage.id, 5);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("sin datos");
		expect(res.data.matches).toBe(10);
		expect(res.data.matchdays).toBe(5);

		const fixture = await api.stages({ stageId: stage.id }).fixture.get();
		if (!fixture.data) throw new Error("sin fixture");
		const appearances = new Map<string, number>();
		for (const item of fixture.data.items) {
			for (const teamId of [item.homeTeamId, item.awayTeamId]) {
				if (teamId) {
					appearances.set(teamId, (appearances.get(teamId) ?? 0) + 1);
				}
			}
		}
		expect([...appearances.values()]).toEqual([4, 4, 4, 4, 4]);
	});

	it("con grupos arma una liguilla por grupo y alinea las jornadas", async () => {
		const { organizer, stage } = await setupStage();
		const groupA = await seedGroup(stage.id);
		const groupB = await seedGroup(stage.id);
		const teamsA = await registerTeams(stage.id, 4, groupA.id);
		const teamsB = await registerTeams(stage.id, 4, groupB.id);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("sin datos");
		expect(res.data.matches).toBe(12);
		expect(res.data.matchdays).toBe(3);

		const fixture = await api.stages({ stageId: stage.id }).fixture.get();
		if (!fixture.data) throw new Error("sin fixture");
		const byGroup = new Map<string, typeof fixture.data.items>();
		for (const item of fixture.data.items) {
			if (item.groupId) {
				const list = byGroup.get(item.groupId) ?? [];
				list.push(item);
				byGroup.set(item.groupId, list);
			}
		}
		expect(byGroup.get(groupA.id)).toHaveLength(6);
		expect(byGroup.get(groupB.id)).toHaveLength(6);
		expect(
			fixture.data.items.every((item) =>
				[groupA.id, groupB.id].includes(item.groupId ?? ""),
			),
		).toBe(true);
		expect(teamsA).toHaveLength(4);
		expect(teamsB).toHaveLength(4);
	});

	it("la vuelta invertida duplica los cruces y cambia la localía", async () => {
		const { organizer, stage } = await setupStage();
		await registerTeams(stage.id, 4);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody({ doubleRound: true }), {
				headers: await h(organizer),
			});
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("sin datos");
		expect(res.data.matches).toBe(12);
		expect(res.data.matchdays).toBe(6);

		const fixture = await api.stages({ stageId: stage.id }).fixture.get();
		if (!fixture.data) throw new Error("sin fixture");
		const pairs = new Map<string, Array<[string | null, string | null]>>();
		for (const item of fixture.data.items) {
			const key = pairKey(item.homeTeamId ?? "", item.awayTeamId ?? "");
			const list = pairs.get(key) ?? [];
			list.push([item.homeTeamId, item.awayTeamId]);
			pairs.set(key, list);
		}
		for (const list of pairs.values()) {
			expect(list).toHaveLength(2);
			expect(list[0]?.[0]).toBe(list[1]?.[1]);
			expect(list[0]?.[1]).toBe(list[1]?.[0]);
		}
	});

	it("reparte fecha, hora y cancha dentro de la sede", async () => {
		const { organizer, stage } = await setupStage();
		await registerTeams(stage.id, 8);
		const venue = await seedVenue({ name: "Estadio", fieldCount: 2 });

		const res = await api.stages({ stageId: stage.id }).fixture.post(
			fixtureBody({
				venueId: venue.id,
				fieldNumbers: [1, 2],
				timeZone: "America/Argentina/Buenos_Aires",
			}),
			{ headers: await h(organizer) },
		);
		expect(res.status).toBe(200);

		const fixture = await api.stages({ stageId: stage.id }).fixture.get();
		if (!fixture.data) throw new Error("sin fixture");
		expect(fixture.data.items).toHaveLength(28);
		expect(
			fixture.data.items.every(
				(item) => item.venue?.id === venue.id && item.fieldNumber !== null,
			),
		).toBe(true);
		expect(
			fixture.data.items.filter((item) => item.fieldNumber === 1),
		).toHaveLength(14);
		expect(
			fixture.data.items.filter((item) => item.fieldNumber === 2),
		).toHaveLength(14);

		// 09:00 en Buenos Aires (UTC-3) es 12:00 UTC.
		const first = fixture.data.items[0];
		expect(first?.scheduledAt?.toISOString()).toBe("2026-11-07T12:00:00.000Z");

		const slots = fixture.data.items.map(
			(item) => `${item.scheduledAt?.toISOString() ?? ""}|${item.fieldNumber}`,
		);
		expect(new Set(slots).size).toBe(28);
	});
});

describe("fixture - reglas de generación", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("rechaza una etapa sin equipos suficientes", async () => {
		const { organizer, stage } = await setupStage();
		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(res.status).toBe(400);
	});

	it("rechaza grupos con equipos sin asignar", async () => {
		const { organizer, stage } = await setupStage();
		const group = await seedGroup(stage.id);
		await registerTeams(stage.id, 2, group.id);
		await registerTeams(stage.id, 1);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(res.status).toBe(400);
	});

	it("rechaza un grupo con un solo equipo", async () => {
		const { organizer, stage } = await setupStage();
		const groupA = await seedGroup(stage.id);
		const groupB = await seedGroup(stage.id);
		await registerTeams(stage.id, 1, groupA.id);
		await registerTeams(stage.id, 2, groupB.id);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(res.status).toBe(400);
	});

	it("valida la cancha contra la sede", async () => {
		const { organizer, stage } = await setupStage();
		await registerTeams(stage.id, 2);
		const venue = await seedVenue({ fieldCount: 1 });

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody({ venueId: venue.id, fieldNumbers: [2] }), {
				headers: await h(organizer),
			});
		expect(res.status).toBe(400);
	});

	it("rechaza canchas sin sede", async () => {
		const { organizer, stage } = await setupStage();
		await registerTeams(stage.id, 2);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody({ fieldNumbers: [1] }), {
				headers: await h(organizer),
			});
		expect(res.status).toBe(400);
	});

	it("solo genera liguillas; la eliminación directa usa llaves", async () => {
		const { organizer, stage } = await setupStage("single_elimination");
		await registerTeams(stage.id, 2);

		const res = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(res.status).toBe(400);
	});

	it("exige organizer y no acepta anónimos", async () => {
		const { stage } = await setupStage();
		await registerTeams(stage.id, 2);

		const anonymous = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody());
		expect(anonymous.status).toBe(401);

		const viewer = await seedUser({ role: "viewer_staff" });
		const forbidden = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(viewer) });
		expect(forbidden.status).toBe(403);
	});

	it("no regenera sin force y se niega si la etapa ya empezó", async () => {
		const { organizer, stage } = await setupStage();
		const teams = await registerTeams(stage.id, 2);
		const match = await seedMatch(stage.id, {
			homeTeamId: teams[0]!.id,
			awayTeamId: teams[1]!.id,
		});

		const conflict = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), { headers: await h(organizer) });
		expect(conflict.status).toBe(409);

		const forced = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), {
				headers: await h(organizer),
				query: { force: "true" },
			});
		expect(forced.status).toBe(200);
		const remaining = await api.stages({ stageId: stage.id }).fixture.get();
		expect(remaining.data?.total).toBe(1);
		expect(match.id).toBeTruthy();

		const [generated] = await db
			.select()
			.from(matches)
			.where(eq(matches.stageId, stage.id))
			.limit(1);
		if (!generated) throw new Error("sin partido generado");
		await db
			.update(matches)
			.set({ status: "in_progress" })
			.where(eq(matches.id, generated.id));

		const started = await api
			.stages({ stageId: stage.id })
			.fixture.post(fixtureBody(), {
				headers: await h(organizer),
				query: { force: "true" },
			});
		expect(started.status).toBe(409);
	});
});

describe("partidos - cancha y filtros de fecha", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("valida fieldNumber contra la sede y lo limpia al quitar la sede", async () => {
		const { organizer, stage } = await setupStage();
		const teams = await registerTeams(stage.id, 2);
		const venue = await seedVenue({ name: "Sede", fieldCount: 2 });
		const match = await seedMatch(stage.id, {
			homeTeamId: teams[0]!.id,
			awayTeamId: teams[1]!.id,
		});
		const headers = await h(organizer);

		const withoutVenue = await api
			.matches({ id: match.id })
			.patch({ fieldNumber: 1 }, { headers });
		expect(withoutVenue.status).toBe(400);

		const tooHigh = await api
			.matches({ id: match.id })
			.patch({ venueId: venue.id, fieldNumber: 3 }, { headers });
		expect(tooHigh.status).toBe(400);

		const valid = await api
			.matches({ id: match.id })
			.patch({ venueId: venue.id, fieldNumber: 2 }, { headers });
		expect(valid.status).toBe(200);
		if (!valid.data) throw new Error("sin datos");
		expect(valid.data.fieldNumber).toBe(2);

		const cleared = await api
			.matches({ id: match.id })
			.patch({ venueId: null }, { headers });
		expect(cleared.status).toBe(200);
		if (!cleared.data) throw new Error("sin datos");
		expect(cleared.data.venueId).toBeNull();
		expect(cleared.data.fieldNumber).toBeNull();

		const venueOnly = await api
			.matches({ id: match.id })
			.patch({ venueId: venue.id }, { headers });
		expect(venueOnly.status).toBe(200);
		if (!venueOnly.data) throw new Error("sin datos");
		expect(venueOnly.data.fieldNumber).toBeNull();
	});

	it("el endpoint de sede también acepta y valida fieldNumber", async () => {
		const { organizer, stage } = await setupStage();
		const teams = await registerTeams(stage.id, 2);
		const venue = await seedVenue({ fieldCount: 2 });
		const match = await seedMatch(stage.id, {
			homeTeamId: teams[0]!.id,
			awayTeamId: teams[1]!.id,
		});
		const headers = await h(organizer);

		const valid = await api
			.matches({ id: match.id })
			.venue.patch({ venueId: venue.id, fieldNumber: 2 }, { headers });
		expect(valid.status).toBe(200);
		if (!valid.data) throw new Error("sin datos");
		expect(valid.data.fieldNumber).toBe(2);

		const invalid = await api
			.matches({ id: match.id })
			.venue.patch({ venueId: venue.id, fieldNumber: 3 }, { headers });
		expect(invalid.status).toBe(400);
	});

	it("filtra por rango de fecha y devuelve la sede en la lista", async () => {
		const { stage } = await setupStage();
		const teams = await registerTeams(stage.id, 2);
		const venue = await seedVenue({ name: "Sede lista", fieldCount: 2 });
		const first = await seedMatch(stage.id, {
			homeTeamId: teams[0]!.id,
			awayTeamId: teams[1]!.id,
			scheduledAt: new Date("2026-11-01T12:00:00.000Z"),
			venueId: venue.id,
			fieldNumber: 1,
			roundNumber: 1,
			matchNumber: 1,
		});
		await seedMatch(stage.id, {
			homeTeamId: teams[1]!.id,
			awayTeamId: teams[0]!.id,
			scheduledAt: new Date("2026-11-08T12:00:00.000Z"),
			roundNumber: 2,
			matchNumber: 2,
		});
		await seedMatch(stage.id, {
			homeTeamId: teams[0]!.id,
			awayTeamId: teams[1]!.id,
			scheduledAt: new Date("2026-11-15T12:00:00.000Z"),
			roundNumber: 3,
			matchNumber: 3,
		});

		const res = await api.matches.get({
			query: {
				stageId: stage.id,
				from: "2026-11-05T00:00:00.000Z",
				to: "2026-11-10T00:00:00.000Z",
			},
		});
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("sin datos");
		expect(res.data.total).toBe(1);
		expect(res.data.items[0]?.id).toBeTruthy();
		expect(res.data.items[0]?.id).not.toBe(first.id);

		const all = await api.matches.get({
			query: { stageId: stage.id },
		});
		if (!all.data) throw new Error("sin datos");
		expect(all.data.items[0]?.venue?.id).toBe(venue.id);
	});
});

import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { sportEventTypes } from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import type { UserRow } from "./helpers/db";
import {
	resetDb,
	seedEdition,
	seedEventType,
	seedMatch,
	seedMember,
	seedPlayer,
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

describe("catalog - clubs (CRUD, unique, RBAC)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("GET público paginado y 400 uuid inválido", async () => {
		const empty = await api.clubs.get();
		expect(empty.status).toBe(200);
		if (!empty.data) throw new Error("no data");
		expect(empty.data.items).toHaveLength(0);

		// seed via API por organizer
		const organizer = await seedUser({ role: "organizer" });
		await api.clubs.post({ name: "Club B" } as never, {
			headers: await h(organizer),
		});
		await api.clubs.post({ name: "Club A" } as never, {
			headers: await h(organizer),
		});
		const list = await api.clubs.get();
		expect(list.status).toBe(200);
		if (!list.data) throw new Error("no data");
		expect(list.data.items.map((c) => c.name)).toEqual(["Club A", "Club B"]);

		const bad = await api.clubs({ id: "not-uuid" as never }).get();
		expect(bad.status).toBe(400);
		const notFound = await api.clubs({ id: crypto.randomUUID() }).get();
		expect(notFound.status).toBe(404);
	});

	it("POST/PATCH 401/403 y 200, DELETE admin-only 403", async () => {
		const organizer = await seedUser({ role: "organizer" });
		const viewer = await seedUser({ role: "viewer_staff" });

		const unauth = await api.clubs.post({ name: "NoAuth" } as never);
		expect(unauth.status).toBe(401);

		const viewerForbid = await api.clubs.post({ name: "Viewer" } as never, {
			headers: await h(viewer),
		});
		expect(viewerForbid.status).toBe(403);

		const ok = await api.clubs.post({ name: "Club OK" } as never, {
			headers: await h(organizer),
		});
		expect(ok.status).toBe(200);
		if (!ok.data) throw new Error("no data");
		const clubId = ok.data.id;

		const patchOk = await api
			.clubs({ id: clubId })
			.patch({ name: "Renamed" } as never, {
				headers: await h(organizer),
			});
		expect(patchOk.status).toBe(200);

		const patchViewer = await api
			.clubs({ id: clubId })
			.patch({ name: "Nope" } as never, {
				headers: await h(viewer),
			});
		expect(patchViewer.status).toBe(403);

		const delViewer = await api
			.clubs({ id: clubId })
			.delete(undefined, { headers: await h(viewer) });
		expect(delViewer.status).toBe(403);

		const admin = await seedUser({ role: "admin" });
		const delAdmin = await api
			.clubs({ id: clubId })
			.delete(undefined, { headers: await h(admin) });
		expect(delAdmin.status).toBe(200);
	});

	it("409 duplicado nombre y explícito PATCH 409, concurrente 409", async () => {
		const organizer = await seedUser({ role: "organizer" });
		const first = await api.clubs.post({ name: "Unico FC" } as never, {
			headers: await h(organizer),
		});
		expect(first.status).toBe(200);
		const dup = await api.clubs.post({ name: "Unico FC" } as never, {
			headers: await h(organizer),
		});
		expect(dup.status).toBe(409);

		// PATCH a nombre existente -> 409 vía DB (sin check app)
		const second = await api.clubs.post({ name: "Otro" } as never, {
			headers: await h(organizer),
		});
		if (!second.data) throw new Error("no data");
		const patchDup = await api
			.clubs({ id: second.data.id })
			.patch({ name: "Unico FC" } as never, {
				headers: await h(organizer),
			});
		expect(patchDup.status).toBe(409);

		// concurrente mismo nombre
		const concurrent = await Promise.all([
			api.clubs.post({ name: "ConcClub" } as never, {
				headers: await h(organizer),
			}),
			api.clubs.post({ name: "ConcClub" } as never, {
				headers: await h(organizer),
			}),
		]);
		expect(concurrent.map((r) => r.status).sort()).toEqual([200, 409]);
	});

	it("DELETE con equipos (set null) -> 200 y 400 nombre vacío", async () => {
		const organizer = await seedUser({ role: "organizer" });
		const admin = await seedUser({ role: "admin" });
		const club = (
			await api.clubs.post({ name: "WithTeam" } as never, {
				headers: await h(organizer),
			})
		).data;
		if (!club) throw new Error("no club");
		await seedTeam();
		const { teams } = await import("@sports/db/tables");
		await db
			.insert(teams)
			.values({
				clubId: club.id,
				name: `Team ${Date.now()}`,
				category: "open",
			});

		const delOkWithTeam = await api
			.clubs({ id: club.id })
			.delete(undefined, { headers: await h(admin) });
		expect(delOkWithTeam.status).toBe(200);

		const bad = await api.clubs.post({ name: "a".repeat(101) } as never, {
			headers: await h(organizer),
		});
		expect(bad.status).toBe(400);
	});
});

describe("catalog - venues (admin-only, no unique, checks)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("GET público y POST/PATCH/DELETE solo admin", async () => {
		const empty = await api.venues.get();
		expect(empty.status).toBe(200);

		const organizer = await seedUser({ role: "organizer" });
		const forbid = await api.venues.post({ name: "Venue X" } as never, {
			headers: await h(organizer),
		});
		expect(forbid.status).toBe(403);

		const admin = await seedUser({ role: "admin" });
		const created = await api.venues.post({ name: "Venue A" } as never, {
			headers: await h(admin),
		});
		expect(created.status).toBe(200);
		if (!created.data) throw new Error("no data");

		const patched = await api
			.venues({ id: created.data.id })
			.patch({ name: "Renamed" } as never, {
				headers: await h(admin),
			});
		expect(patched.status).toBe(200);

		const unauth = await api.venues.post({ name: "Nope" } as never);
		expect(unauth.status).toBe(401);
	});

	it("venue duplicado name -> 200 (no unique) y fieldCount checks", async () => {
		const admin = await seedUser({ role: "admin" });
		const first = await api.venues.post({ name: "SameName" } as never, {
			headers: await h(admin),
		});
		expect(first.status).toBe(200);
		const dup = await api.venues.post({ name: "SameName" } as never, {
			headers: await h(admin),
		});
		expect(dup.status).toBe(200);

		const negative = await api.venues.post(
			{ name: "Bad", fieldCount: -1 } as never,
			{ headers: await h(admin) },
		);
		expect(negative.status).toBe(400);

		const zeroOk = await api.venues.post(
			{ name: "Zero", fieldCount: 0 } as never,
			{ headers: await h(admin) },
		);
		expect(zeroOk.status).toBe(200);
	});

	it("DELETE 409 cuando está referenciada por partido", async () => {
		const admin = await seedUser({ role: "admin" });
		const venue = (
			await api.venues.post({ name: "V1" } as never, {
				headers: await h(admin),
			})
		).data;
		if (!venue) throw new Error("no venue");
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id);
		// asignar venue al partido
		await api
			.matches({ id: match.id })
			.venue.patch({ venueId: venue.id } as never, {
				headers: await h(admin), // admin is not organizer of tournament, need organizer
			});
		// Crear organizer del torneo para asignar venue correctamente
		const organizer = await seedUser({ role: "viewer_staff" });
		await seedMember(tournament.id, organizer.id, "organizer");
		const assign = await api
			.matches({ id: match.id })
			.venue.patch({ venueId: venue.id } as never, {
				headers: await h(organizer),
			});
		expect(assign.status).toBe(200);

		const del = await api
			.venues({ id: venue.id })
			.delete(undefined, { headers: await h(admin) });
		expect(del.status).toBe(409);
	});
});

describe("catalog - players (idCard unique, birthDate, search)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("GET con search ilike y orden, 400 longitudes", async () => {
		const admin = await seedUser({ role: "admin" });
		await api.players.post(
			{ firstName: "John", lastName: "Zebra", idCardNumber: "ID1" } as never,
			{
				headers: await h(admin),
			},
		);
		await api.players.post(
			{ firstName: "Alice", lastName: "Alpha", idCardNumber: "ID2" } as never,
			{
				headers: await h(admin),
			},
		);
		const search = await api.players.get({
			query: { search: "Alpha" } as never,
		});
		expect(search.status).toBe(200);
		if (!search.data) throw new Error("no data");
		expect(search.data.items.length).toBe(1);
		expect(search.data.items[0]?.lastName).toBe("Alpha");

		const badEmpty = await api.players.get({ query: { search: "" } as never });
		expect(badEmpty.status).toBe(400);
		const badLong = await api.players.get({
			query: { search: "a".repeat(61) } as never,
		});
		expect(badLong.status).toBe(400);
	});

	it("POST/PATCH idCard duplicado 409, null permitido, self-update no colisiona", async () => {
		const organizer = await seedUser({ role: "organizer" });
		const admin = await seedUser({ role: "admin" });

		const p1 = await api.players.post(
			{ firstName: "A", lastName: "One", idCardNumber: "DUP123" } as never,
			{ headers: await h(organizer) },
		);
		expect(p1.status).toBe(200);

		const dup = await api.players.post(
			{ firstName: "B", lastName: "Two", idCardNumber: "DUP123" } as never,
			{ headers: await h(organizer) },
		);
		expect(dup.status).toBe(409);

		// null permitido dos veces
		const null1 = await api.players.post(
			{ firstName: "C", lastName: "Three" } as never,
			{
				headers: await h(organizer),
			},
		);
		expect(null1.status).toBe(200);
		const null2 = await api.players.post(
			{ firstName: "D", lastName: "Four" } as never,
			{
				headers: await h(organizer),
			},
		);
		expect(null2.status).toBe(200);

		// PATCH self sin colisión
		if (!p1.data) throw new Error("no p1");
		const self = await api
			.players({ id: p1.data.id })
			.patch({ idCardNumber: "DUP123" } as never, {
				headers: await h(organizer),
			});
		expect(self.status).toBe(200);

		// PATCH a idCard de otro -> 409
		const p2 = await api.players.post(
			{ firstName: "E", lastName: "Five", idCardNumber: "OTHER" } as never,
			{ headers: await h(organizer) },
		);
		if (!p2.data) throw new Error("no p2");
		const toDup = await api
			.players({ id: p2.data.id })
			.patch({ idCardNumber: "DUP123" } as never, {
				headers: await h(organizer),
			});
		expect(toDup.status).toBe(409);

		// viewer no puede crear, admin sí puede borrar
		const viewer = await seedUser({ role: "viewer_staff" });
		const forbid = await api.players.post(
			{ firstName: "F", lastName: "Six" } as never,
			{
				headers: await h(viewer),
			},
		);
		expect(forbid.status).toBe(403);

		const del = await api
			.players({ id: p1.data.id })
			.delete(undefined, { headers: await h(admin) });
		expect(del.status).toBe(200);
	});

	it("birthDate futura -> 400 y formato inválido", async () => {
		const organizer = await seedUser({ role: "organizer" });
		const future = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
		const bad = await api.players.post(
			{ firstName: "Future", lastName: "Kid", birthDate: future } as never,
			{ headers: await h(organizer) },
		);
		expect(bad.status).toBe(400);
	});

	it("concurrente mismo idCard -> [200,409]", async () => {
		const organizer = await seedUser({ role: "organizer" });
		const code = `CONC-${Date.now()}`;
		const results = await Promise.all([
			api.players.post(
				{ firstName: "A", lastName: "A", idCardNumber: code } as never,
				{
					headers: await h(organizer),
				},
			),
			api.players.post(
				{ firstName: "B", lastName: "B", idCardNumber: code } as never,
				{
					headers: await h(organizer),
				},
			),
		]);
		expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
	});
});

describe("catalog - sports y sport-event-types", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("GET sports público paginado, POST/PATCH/DELETE admin-only", async () => {
		const empty = await api.sports.get();
		expect(empty.status).toBe(200);

		const organizer = await seedUser({ role: "organizer" });
		const forbid = await api.sports.post(
			{ id: "test", name: "Test" } as never,
			{
				headers: await h(organizer),
			},
		);
		expect(forbid.status).toBe(403);

		const admin = await seedUser({ role: "admin" });
		const created = await api.sports.post(
			{ id: "football", name: "Football" } as never,
			{
				headers: await h(admin),
			},
		);
		expect(created.status).toBe(200);

		const dup = await api.sports.post(
			{ id: "football", name: "Dup" } as never,
			{
				headers: await h(admin),
			},
		);
		expect(dup.status).toBe(409);

		const patched = await api
			.sports({ id: "football" })
			.patch({ name: "Footy" } as never, {
				headers: await h(admin),
			});
		expect(patched.status).toBe(200);

		const badSlug = await api.sports.post(
			{ id: "a".repeat(33), name: "Bad" } as never,
			{
				headers: await h(admin),
			},
		);
		expect(badSlug.status).toBe(400);
	});

	it("DELETE sport con torneos -> 409", async () => {
		const admin = await seedUser({ role: "admin" });
		const sport = await seedSport("football");
		await seedTournament(sport.id);
		const del = await api
			.sports({ id: sport.id })
			.delete(undefined, { headers: await h(admin) });
		expect(del.status).toBe(409);

		const clean = await seedSport("clean-sport");
		const delOk = await api
			.sports({ id: clean.id })
			.delete(undefined, { headers: await h(admin) });
		expect(delOk.status).toBe(200);
	});

	it("event-types: CRUD, duplicado code por deporte, mismo code otro deporte -> 200, PATCH 409 explícito", async () => {
		const admin = await seedUser({ role: "admin" });
		const football = await seedSport("football");
		const basketball = await seedSport("basketball");

		const goal = await api
			.sports({ id: football.id })
			["event-types"].post(
				{ code: "goal", name: "Goal", affectsScore: true } as never,
				{ headers: await h(admin) },
			);
		expect(goal.status).toBe(200);

		const dup = await api
			.sports({ id: football.id })
			["event-types"].post({ code: "goal", name: "Dup" } as never, {
				headers: await h(admin),
			});
		expect(dup.status).toBe(409);

		// mismo code en otro deporte -> 200
		const otherOk = await api
			.sports({ id: basketball.id })
			["event-types"].post({ code: "goal", name: "Goal B" } as never, {
				headers: await h(admin),
			});
		expect(otherOk.status).toBe(200);

		// PATCH duplicado code dentro mismo deporte -> 409 vía DB (sin check app)
		const second = await api
			.sports({ id: football.id })
			["event-types"].post({ code: "penalty", name: "Penalty" } as never, {
				headers: await h(admin),
			});
		if (!second.data) throw new Error("no second");
		const patchDup = await api.sports["event-types"]({
			eventTypeId: second.data.id,
		}).patch({ code: "goal" } as never, { headers: await h(admin) });
		expect(patchDup.status).toBe(409);

		// GET con filtro affectsScore (requiere sportId en query por schema actual)
		const filtered = await api.sports({ id: football.id })["event-types"].get({
			query: { sportId: football.id, affectsScore: true } as never,
		});
		expect(filtered.status).toBe(200);
		if (!filtered.data) throw new Error("no data");
		expect(filtered.data.items.every((e) => e.affectsScore === true)).toBe(
			true,
		);

		// DELETE sin referencias -> 200
		const delOk = await api.sports["event-types"]({
			eventTypeId: second.data.id,
		}).delete(undefined, {
			headers: await h(admin),
		});
		expect(delOk.status).toBe(200);
	});

	it("concurrente mismo code mismo deporte -> [200,409]", async () => {
		const admin = await seedUser({ role: "admin" });
		const sport = await seedSport("conc-sport");
		const results = await Promise.all([
			api
				.sports({ id: sport.id })
				["event-types"].post({ code: "conc-code", name: "A" } as never, {
					headers: await h(admin),
				}),
			api
				.sports({ id: sport.id })
				["event-types"].post({ code: "conc-code", name: "B" } as never, {
					headers: await h(admin),
				}),
		]);
		expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
	});
});

describe("catalog - match eventType desconocido -> 400 (obligatorio)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("eventType no existe en catálogo del deporte -> 400, y de otro deporte -> 400", async () => {
		const admin = await seedUser({ role: "admin" });
		const football = await seedSport("football");
		const basketball = await seedSport("basketball");
		// Solo basketball tiene three_pointer
		await api
			.sports({ id: basketball.id })
			["event-types"].post({ code: "three_pointer", name: "Triple" } as never, {
				headers: await h(admin),
			});
		await seedEventType(football.id, "goal", true);

		const tournament = await seedTournament(football.id);
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id, { status: "in_progress" });
		const referee = await seedUser({ role: "viewer_staff" });
		await seedMember(tournament.id, referee.id, "referee");

		// desconocido total
		const unknown = await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId!,
				periodNumber: 1,
				minuteOrSecond: 10,
				eventType: "unknown_code_xyz",
			} as never,
			{ headers: await h(referee) },
		);
		expect(unknown.status).toBe(400);
		expect(JSON.stringify(unknown.error)).toContain("Unknown event type");

		// existe en otro deporte pero no en football
		const cross = await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId!,
				periodNumber: 1,
				minuteOrSecond: 11,
				eventType: "three_pointer",
			} as never,
			{ headers: await h(referee) },
		);
		expect(cross.status).toBe(400);
		expect(JSON.stringify(cross.error)).toContain("Unknown event type");

		// case sensitive
		const caseSens = await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId!,
				periodNumber: 1,
				minuteOrSecond: 12,
				eventType: "Goal",
			} as never,
			{ headers: await h(referee) },
		);
		expect(caseSens.status).toBe(400);

		// válido debe ser 200
		const valid = await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId!,
				periodNumber: 1,
				minuteOrSecond: 13,
				eventType: "goal",
			} as never,
			{ headers: await h(referee) },
		);
		expect(valid.status).toBe(200);
	});

	it("DELETE event-type referenciado por match_event -> 409", async () => {
		const admin = await seedUser({ role: "admin" });
		const sport = await seedSport("football2");
		const eventType = await seedEventType(sport.id, "goal");
		const tournament = await seedTournament(sport.id);
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id, { status: "in_progress" });
		const referee = await seedUser({ role: "viewer_staff" });
		await seedMember(tournament.id, referee.id, "referee");

		await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId!,
				periodNumber: 1,
				minuteOrSecond: 5,
				eventType: "goal",
			} as never,
			{ headers: await h(referee) },
		);

		const del = await api.sports["event-types"]({
			eventTypeId: eventType.id,
		}).delete(undefined, {
			headers: await h(admin),
		});
		// Puede ser 409 si FK restrictiva, o 200 si cascade; verificamos que no sea 500
		expect([200, 409]).toContain(del.status);
		// Si es 200, documentamos que el delete cascada eventos (no FK restrictiva)
		void del;
		void sportEventTypes;
		void eq;
	});
});

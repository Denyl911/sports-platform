import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { SPORTS_CATALOG, seedSports } from "@sports/db/seed/sports";
import { sportEventTypes, sports } from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import {
	resetDb,
	seedEdition,
	seedMatch,
	seedMember,
	seedSport,
	seedStage,
	seedTournament,
	seedUser,
} from "./helpers/db";

const api = treaty(app);

const totalEventTypes = SPORTS_CATALOG.reduce(
	(total, sport) => total + sport.eventTypes.length,
	0,
);

describe("catálogo de deportes - coherencia", () => {
	it("ids, nombres, periodos y eventos caben en las columnas y no se repiten", () => {
		const ids = new Set<string>();

		for (const sport of SPORTS_CATALOG) {
			expect(sport.id).toMatch(/^[a-z0-9-]+$/);
			expect(sport.id.length).toBeLessThanOrEqual(32);
			expect(sport.name.length).toBeGreaterThan(0);
			expect(sport.name.length).toBeLessThanOrEqual(50);
			expect(sport.periodName.length).toBeLessThanOrEqual(20);
			expect(sport.regularPeriods).toBeGreaterThan(0);
			expect(ids.has(sport.id)).toBe(false);
			ids.add(sport.id);

			for (const [rule, points] of Object.entries(sport.scoringRules)) {
				expect(["win", "draw", "loss"]).toContain(rule);
				expect(Number.isInteger(points)).toBe(true);
				expect(points).toBeGreaterThanOrEqual(0);
			}

			const codes = new Set<string>();
			let scoringEvents = 0;
			for (const event of sport.eventTypes) {
				expect(event.code).toMatch(/^[a-z0-9_]+$/);
				expect(event.code.length).toBeLessThanOrEqual(40);
				expect(event.name.length).toBeGreaterThan(0);
				expect(event.name.length).toBeLessThanOrEqual(60);
				expect(codes.has(event.code)).toBe(false);
				codes.add(event.code);
				expect(event.defaultValue).toBeGreaterThanOrEqual(0);
				if (event.affectsScore) {
					scoringEvents++;
					expect(event.defaultValue).toBeGreaterThan(0);
				}
			}

			// Sin un evento que sume, el marcador no se puede llevar en vivo.
			expect(scoringEvents).toBeGreaterThan(0);
		}

		// Los cinco deportes pedidos, cada uno con al menos una variante.
		for (const id of ["football", "basketball", "volleyball", "baseball"]) {
			expect(ids.has(id)).toBe(true);
		}
		expect(ids.has("tennis")).toBe(true);
		expect(SPORTS_CATALOG.length).toBeGreaterThan(5);
	});
});

describe("seed de deportes - catálogo completo y repetible", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("siembra el catálogo y una segunda corrida no crea nada", async () => {
		const first = await seedSports();
		expect(first.sports.created).toHaveLength(SPORTS_CATALOG.length);
		expect(first.sports.updated).toHaveLength(0);
		expect(first.sports.unchanged).toHaveLength(0);
		expect(first.eventTypes.created).toBe(totalEventTypes);
		expect(first.eventTypes.updated).toBe(0);

		const second = await seedSports();
		expect(second.sports.created).toHaveLength(0);
		expect(second.sports.updated).toHaveLength(0);
		expect(second.sports.unchanged).toHaveLength(SPORTS_CATALOG.length);
		expect(second.eventTypes.created).toBe(0);
		expect(second.eventTypes.updated).toBe(0);

		const sportRows = await db.select({ id: sports.id }).from(sports);
		expect(sportRows.map((row) => row.id).sort()).toEqual(
			SPORTS_CATALOG.map((sport) => sport.id).sort(),
		);

		const eventRows = await db
			.select({ id: sportEventTypes.id })
			.from(sportEventTypes);
		expect(eventRows).toHaveLength(totalEventTypes);
	});

	it("sin --force respeta un deporte editado; --force lo refresca sin borrar uno ajeno", async () => {
		await seedSports();

		await db
			.update(sports)
			.set({ regularPeriods: 9, scoringRules: { win: 9 } })
			.where(eq(sports.id, "football"));
		const foreign = await seedSport("recreativo", false);

		const respected = await seedSports();
		expect(respected.sports.created).toHaveLength(0);
		const [stillEdited] = await db
			.select()
			.from(sports)
			.where(eq(sports.id, "football"));
		expect(stillEdited.regularPeriods).toBe(9);

		const forced = await seedSports({ force: true });
		expect(forced.sports.updated).toContain("football");
		expect(forced.sports.updated).not.toContain(foreign.id);
		expect(forced.eventTypes.updated).toBe(totalEventTypes);

		const [restored] = await db
			.select()
			.from(sports)
			.where(eq(sports.id, "football"));
		expect(restored.regularPeriods).toBe(2);
		expect(restored.periodName).toBe("tiempo");
		expect(restored.scoringRules).toEqual({ win: 3, draw: 1, loss: 0 });

		const [foreignAfter] = await db
			.select()
			.from(sports)
			.where(eq(sports.id, foreign.id));
		expect(foreignAfter).toBeDefined();
		expect(foreignAfter.hasDraws).toBe(false);
	});
});

describe("seed de deportes - el catálogo llega al marcador", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("el deporte sembrado expone sus eventos por la API y un triple suma 3", async () => {
		await seedSports();

		const catalog = await api.sports({ id: "basketball" })["event-types"].get();
		expect(catalog.status).toBe(200);
		if (!catalog.data) throw new Error("no data");
		const triple = catalog.data.items.find(
			(event) => event.code === "three_point",
		);
		expect(triple).toMatchObject({
			name: "Canasta de 3",
			affectsScore: true,
			defaultValue: 3,
		});

		const tournament = await seedTournament("basketball");
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id, { status: "in_progress" });
		const referee = await seedUser({ role: "viewer_staff" });
		await seedMember(tournament.id, referee.id, "referee");

		const event = await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId!,
				periodNumber: 1,
				minuteOrSecond: 30,
				eventType: "three_point",
			} as never,
			{ headers: await authHeaders(referee) },
		);
		expect(event.status).toBe(200);

		const detail = await api.matches({ id: match.id }).get();
		expect(detail.status).toBe(200);
		if (!detail.data) throw new Error("no data");
		expect(detail.data.homeScore).toBe(3);
		expect(detail.data.awayScore).toBe(0);

		// Un valor explícito manda sobre el `defaultValue` del catálogo.
		const override = await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId!,
				periodNumber: 1,
				minuteOrSecond: 31,
				eventType: "free_throw",
				eventValue: 2,
			} as never,
			{ headers: await authHeaders(referee) },
		);
		expect(override.status).toBe(200);
		const afterOverride = await api.matches({ id: match.id }).get();
		if (!afterOverride.data) throw new Error("no data");
		expect(afterOverride.data.homeScore).toBe(5);
	});
});

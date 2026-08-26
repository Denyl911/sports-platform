import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import {
	resetDb,
	seedEdition,
	seedEventType,
	seedMatch,
	seedMember,
	seedStage,
	seedTournament,
	seedUser,
} from "./helpers/db";

const api = treaty(app);

describe("integrity", () => {
	beforeEach(resetDb);

	it("todos los listados retornan el envelope {items, total}", async () => {
		const admin = await seedUser({ role: "admin" });
		const adminHeaders = await authHeaders(admin);

		const publicLists = [
			api.matches.get({ query: {} }),
			api.tournaments.get(),
			api.sports.get(),
			api.venues.get(),
			api.clubs.get(),
			api.teams.get({ query: {} }),
			api.players.get(),
		];

		for (const promise of publicLists) {
			const { data, error } = await promise;
			expect(error).toBeNull();
			if (!data) throw new Error("no data");
			expect(Array.isArray(data.items)).toBe(true);
			expect(typeof data.total).toBe("number");
		}

		const users = await api.users.get({ headers: adminHeaders });
		expect(users.data?.items).toBeArray();
		expect(typeof users.data?.total).toBe("number");
	});

	it("FK violation (23503): delete sport con torneos → 409", async () => {
		const admin = await seedUser({ role: "admin" });
		const tournament = await seedTournament();

		const { status } = await api
			.sports({ id: tournament.sportId })
			.delete(undefined, {
				headers: await authHeaders(admin),
			});
		expect(status).toBe(409);
	});

	it("FK violation (23503): delete player con eventos → 409", async () => {
		const admin = await seedUser({ role: "admin" });
		const tournament = await seedTournament();
		await seedEventType(tournament.sportId);
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id, { status: "in_progress" });

		const player = await api.players.post(
			{ firstName: "Test", lastName: "Player" },
			{ headers: await authHeaders(admin) },
		);
		if (!player.data) throw new Error("no player");
		const referee = await seedUser({ role: "referee" });
		await seedMember(tournament.id, referee.id, "referee");

		await api.matches({ id: match.id }).events.post(
			{
				teamId: match.homeTeamId ?? "",
				playerId: player.data.id,
				periodNumber: 1,
				minuteOrSecond: 10,
				eventType: "goal",
			},
			{ headers: await authHeaders(referee) },
		);

		const { status } = await api
			.players({ id: player.data.id })
			.delete(undefined, {
				headers: await authHeaders(admin),
			});
		expect(status).toBe(409);
	});

	it("duplicate key (23505): club duplicado → 409", async () => {
		const organizer = await seedUser({ role: "organizer" });
		const headers = await authHeaders(organizer);

		const first = await api.clubs.post({ name: "Club Único FC" }, { headers });
		expect(first.status).toBe(200);

		const second = await api.clubs.post({ name: "Club Único FC" }, { headers });
		expect(second.status).toBe(409);
	});

	it("recursos inexistentes → 404 con JSON {message}", async () => {
		const ghost = crypto.randomUUID();

		const match = await app.handle(
			new Request(`http://localhost/matches/${ghost}`),
		);
		expect(match.status).toBe(404);
		expect(await match.json()).toHaveProperty("message");

		const tournament = await api.tournaments({ tournamentId: ghost }).get();
		expect(tournament.status).toBe(404);

		const team = await api.teams({ id: ghost }).get();
		expect(team.status).toBe(404);
	});
});

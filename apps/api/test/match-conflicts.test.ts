import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import type { UserRow } from "./helpers/db";
import {
	resetDb,
	seedEdition,
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

const SATURDAY = new Date("2026-11-07T12:00:00.000Z");
const SUNDAY = new Date("2026-11-08T12:00:00.000Z");

function h(user: UserRow) {
	return authHeaders(user);
}

async function setupStage() {
	const organizer = await seedUser({ role: "organizer" });
	const sport = await seedSport();
	const tournament = await seedTournament(sport.id);
	const edition = await seedEdition(tournament.id);
	const stage = await seedStage(edition.id);
	await seedMember(tournament.id, organizer.id, "organizer");
	return { organizer, tournament, edition, stage };
}

async function schedule(matchId: string, user: UserRow, scheduledAt: Date) {
	return api
		.matches({ id: matchId })
		.schedule.patch(
			{ scheduledAt: scheduledAt.toISOString() },
			{ headers: await h(user) },
		);
}

describe("partidos - choques de equipo y cancha", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("no programa un equipo a la misma hora que otro de sus partidos", async () => {
		const { organizer, stage } = await setupStage();
		const tigers = await seedTeam("Los Tigres");
		const eagles = await seedTeam("Las Águilas");
		const lions = await seedTeam("Los Leones");

		await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: eagles.id,
			scheduledAt: SATURDAY,
		});
		const second = await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: lions.id,
			scheduledAt: SUNDAY,
		});

		const res = await schedule(second.id, organizer, SATURDAY);
		expect(res.status).toBe(409);
		expect(JSON.stringify(res.error)).toContain("Los Tigres");
		expect(JSON.stringify(res.error)).toContain("Las Águilas");
	});

	it("no programa dos partidos en la misma cancha a la misma hora", async () => {
		const { organizer, stage } = await setupStage();
		const venue = await seedVenue({ name: "Estadio", fieldCount: 2 });
		const first = await seedMatch(stage.id, {
			scheduledAt: SATURDAY,
			venueId: venue.id,
			fieldNumber: 1,
		});
		const second = await seedMatch(stage.id, {
			scheduledAt: SUNDAY,
			venueId: venue.id,
			fieldNumber: 1,
		});

		const res = await schedule(second.id, organizer, SATURDAY);
		expect(res.status).toBe(409);
		expect(JSON.stringify(res.error)).toContain("cancha 1");
		expect(JSON.stringify(res.error)).toContain("Estadio");
		expect(first.id).toBeTruthy();
	});

	it("no asigna una cancha ocupada a la misma hora", async () => {
		const { organizer, stage } = await setupStage();
		const venue = await seedVenue({ name: "Estadio", fieldCount: 2 });
		await seedMatch(stage.id, {
			scheduledAt: SATURDAY,
			venueId: venue.id,
			fieldNumber: 1,
		});
		const second = await seedMatch(stage.id, {
			scheduledAt: SATURDAY,
			venueId: venue.id,
			fieldNumber: 2,
		});

		const res = await api
			.matches({ id: second.id })
			.venue.patch(
				{ venueId: venue.id, fieldNumber: 1 },
				{ headers: await h(organizer) },
			);
		expect(res.status).toBe(409);
		expect(JSON.stringify(res.error)).toContain("cancha 1");
	});

	it("la edición general también rechaza el choque de fecha", async () => {
		const { organizer, stage } = await setupStage();
		const tigers = await seedTeam("Los Tigres");
		const eagles = await seedTeam("Las Águilas");
		const lions = await seedTeam("Los Leones");

		await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: eagles.id,
			scheduledAt: SATURDAY,
		});
		const second = await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: lions.id,
			scheduledAt: SUNDAY,
		});

		const res = await api
			.matches({ id: second.id })
			.patch(
				{ scheduledAt: SATURDAY.toISOString() },
				{ headers: await h(organizer) },
			);
		expect(res.status).toBe(409);
		expect(JSON.stringify(res.error)).toContain("Los Tigres");
	});

	it("crear un partido también rechaza un equipo ya ocupado", async () => {
		const { organizer, tournament, stage } = await setupStage();
		const tigers = await seedTeam("Los Tigres");
		const eagles = await seedTeam("Las Águilas");
		const lions = await seedTeam("Los Leones");

		await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: eagles.id,
			scheduledAt: SATURDAY,
		});
		await seedRegistration(stage.id, lions.id);

		const res = await api.matches.post(
			{
				tournamentId: tournament.id,
				stageId: stage.id,
				homeTeamId: tigers.id,
				awayTeamId: lions.id,
				scheduledAt: SATURDAY.toISOString(),
			},
			{ headers: await h(organizer) },
		);
		expect(res.status).toBe(409);
		expect(JSON.stringify(res.error)).toContain("Los Tigres");
	});

	it("un partido cancelado no ocupa el horario", async () => {
		const { organizer, stage } = await setupStage();
		const tigers = await seedTeam("Los Tigres");
		const eagles = await seedTeam("Las Águilas");
		const lions = await seedTeam("Los Leones");

		await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: eagles.id,
			scheduledAt: SATURDAY,
			status: "cancelled",
		});
		const second = await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: lions.id,
			scheduledAt: SUNDAY,
		});

		const res = await schedule(second.id, organizer, SATURDAY);
		expect(res.status).toBe(200);
	});

	it("la misma cancha en otra hora o la misma hora en otra cancha se aceptan", async () => {
		const { organizer, stage } = await setupStage();
		const venue = await seedVenue({ name: "Estadio", fieldCount: 2 });
		await seedMatch(stage.id, {
			scheduledAt: SATURDAY,
			venueId: venue.id,
			fieldNumber: 1,
		});
		const second = await seedMatch(stage.id, {
			scheduledAt: SUNDAY,
			venueId: venue.id,
			fieldNumber: 1,
		});

		const otherTime = await schedule(second.id, organizer, SUNDAY);
		expect(otherTime.status).toBe(200);

		const otherCourt = await api
			.matches({ id: second.id })
			.venue.patch(
				{ venueId: venue.id, fieldNumber: 2 },
				{ headers: await h(organizer) },
			);
		expect(otherCourt.status).toBe(200);
	});

	it("reprogramar o mover un partido a su propio horario no choca consigo mismo", async () => {
		const { organizer, stage } = await setupStage();
		const venue = await seedVenue({ fieldCount: 1 });
		const match = await seedMatch(stage.id, {
			scheduledAt: SATURDAY,
			venueId: venue.id,
			fieldNumber: 1,
		});

		const rescheduled = await schedule(match.id, organizer, SATURDAY);
		expect(rescheduled.status).toBe(200);

		const sameCourt = await api
			.matches({ id: match.id })
			.venue.patch(
				{ venueId: venue.id, fieldNumber: 1 },
				{ headers: await h(organizer) },
			);
		expect(sameCourt.status).toBe(200);
	});

	it("el choque también se detecta contra un partido de otra etapa", async () => {
		const { organizer, edition, stage } = await setupStage();
		const otherStage = await seedStage(edition.id);
		const tigers = await seedTeam("Los Tigres");
		const eagles = await seedTeam("Las Águilas");
		const lions = await seedTeam("Los Leones");

		await seedMatch(otherStage.id, {
			homeTeamId: tigers.id,
			awayTeamId: eagles.id,
			scheduledAt: SATURDAY,
		});
		const second = await seedMatch(stage.id, {
			homeTeamId: tigers.id,
			awayTeamId: lions.id,
			scheduledAt: SUNDAY,
		});

		const res = await schedule(second.id, organizer, SATURDAY);
		expect(res.status).toBe(409);
	});
});

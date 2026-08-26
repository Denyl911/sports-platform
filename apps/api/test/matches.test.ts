import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { matches, matchPeriods } from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import type { UserRow } from "./helpers/db";
import {
	resetDb,
	seedEdition,
	seedEventType,
	seedGroup,
	seedMatch,
	seedMember,
	seedRegistration,
	seedStage,
	seedTeam,
	seedTournament,
	seedUser,
} from "./helpers/db";

const api = treaty(app);

interface Ctx {
	referee: UserRow;
	organizer: UserRow;
	tournamentId: string;
	editionId: string;
	stageId: string;
	groupId: string;
	siblingStageId: string; // segunda etapa de la misma edición
	otherTournamentStageId: string;
	matchId: string;
	homeTeamId: string;
	awayTeamId: string;
}

let ctx: Ctx;

beforeEach(async () => {
	await resetDb();

	const [refereeUser, organizerUser] = await Promise.all([
		seedUser({ role: "viewer_staff" }),
		seedUser({ role: "viewer_staff" }),
	]);

	const tournament = await seedTournament();
	await seedEventType(tournament.sportId);
	const edition = await seedEdition(tournament.id);
	const stage = await seedStage(edition.id);
	const siblingStage = await seedStage(edition.id); // sequence_order 2
	const group = await seedGroup(stage.id);

	// Otro torneo con su propia etapa
	const otherTournament = await seedTournament();
	const otherEdition = await seedEdition(otherTournament.id);
	const otherStage = await seedStage(otherEdition.id);

	await seedMember(tournament.id, refereeUser.id, "referee");
	await seedMember(tournament.id, organizerUser.id, "organizer");

	const home = await seedTeam();
	const away = await seedTeam();
	const match = await seedMatch(stage.id, {
		groupId: group.id,
		homeTeamId: home.id,
		awayTeamId: away.id,
	});

	ctx = {
		referee: refereeUser,
		organizer: organizerUser,
		tournamentId: tournament.id,
		editionId: edition.id,
		stageId: stage.id,
		groupId: group.id,
		siblingStageId: siblingStage.id,
		otherTournamentStageId: otherStage.id,
		matchId: match.id,
		homeTeamId: home.id,
		awayTeamId: away.id,
	};
});

function h(user: UserRow) {
	return authHeaders(user);
}

async function startMatch(matchId = ctx.matchId) {
	return api
		.matches({ id: matchId })
		.score.patch(
			{ homeScore: 0, awayScore: 0, status: "in_progress" },
			{ headers: await h(ctx.referee) },
		);
}

describe("matches - creación", () => {
	it("create feliz → 200", async () => {
		const teamC = await seedTeam();
		await seedRegistration(ctx.stageId, teamC.id);

		const { status } = await api.matches.post(
			{
				tournamentId: ctx.tournamentId,
				stageId: ctx.stageId,
				homeTeamId: ctx.homeTeamId,
				awayTeamId: teamC.id,
			},
			{ headers: await h(ctx.organizer) },
		);
		expect(status).toBe(200);
	});

	it("etapa de otro torneo → 400", async () => {
		const { status } = await api.matches.post(
			{
				tournamentId: ctx.tournamentId,
				stageId: ctx.otherTournamentStageId,
			},
			{ headers: await h(ctx.organizer) },
		);
		expect(status).toBe(400);
	});

	it("grupo de otra etapa → 400", async () => {
		const foreignGroup = await seedGroup(ctx.siblingStageId);

		const { status } = await api.matches.post(
			{
				tournamentId: ctx.tournamentId,
				stageId: ctx.stageId,
				groupId: foreignGroup.id,
			},
			{ headers: await h(ctx.organizer) },
		);
		expect(status).toBe(400);
	});

	it("un solo equipo → 400", async () => {
		const { status } = await api.matches.post(
			{
				tournamentId: ctx.tournamentId,
				stageId: ctx.stageId,
				homeTeamId: ctx.homeTeamId,
			},
			{ headers: await h(ctx.organizer) },
		);
		expect(status).toBe(400);
	});
});

describe("matches - marcador en vivo", () => {
	it("transición inválida scheduled→finished → 400", async () => {
		const { status } = await api
			.matches({ id: ctx.matchId })
			.score.patch(
				{ homeScore: 1, awayScore: 0, status: "finished" },
				{ headers: await h(ctx.referee) },
			);
		expect(status).toBe(400);
	});

	it("walkover sin winnerTeamId → 400; con winner → 200", async () => {
		const noWinner = await api
			.matches({ id: ctx.matchId })
			.score.patch(
				{ homeScore: 0, awayScore: 0, status: "walkover" },
				{ headers: await h(ctx.referee) },
			);
		expect(noWinner.status).toBe(400);

		const withWinner = await api.matches({ id: ctx.matchId }).score.patch(
			{
				homeScore: 0,
				awayScore: 0,
				status: "walkover",
				winnerTeamId: ctx.homeTeamId,
			},
			{ headers: await h(ctx.referee) },
		);
		expect(withWinner.status).toBe(200);
		expect(withWinner.data?.winnerTeamId).toBe(ctx.homeTeamId);
	});

	it("in_progress→finished deriva ganador del marcador", async () => {
		expect((await startMatch()).status).toBe(200);

		const finish = await api
			.matches({ id: ctx.matchId })
			.score.patch(
				{ homeScore: 2, awayScore: 1, status: "finished" },
				{ headers: await h(ctx.referee) },
			);
		expect(finish.status).toBe(200);
		expect(finish.data?.winnerTeamId).toBe(ctx.homeTeamId);
	});

	it("empate finalizado sin prórroga → winner NULL", async () => {
		await startMatch();
		const finish = await api
			.matches({ id: ctx.matchId })
			.score.patch(
				{ homeScore: 1, awayScore: 1, status: "finished" },
				{ headers: await h(ctx.referee) },
			);
		expect(finish.status).toBe(200);
		expect(finish.data?.winnerTeamId).toBeNull();
	});

	it("períodos flexibles: overtime crea período tipo overtime", async () => {
		await startMatch();

		const overtime = await api.matches({ id: ctx.matchId }).score.patch(
			{
				homeScore: 3,
				awayScore: 3,
				status: "in_progress",
				periodNumber: 5,
				periodType: "overtime",
			},
			{ headers: await h(ctx.referee) },
		);
		expect(overtime.status).toBe(200);

		const rows = await db
			.select()
			.from(matchPeriods)
			.where(eq(matchPeriods.matchId, ctx.matchId));
		const ot = rows.find((r) => r.periodType === "overtime");
		expect(ot?.periodNumber).toBe(5);
	});
});

describe("matches - eventos y PATCH info", () => {
	it("eventos puntuables recalculan el marcador", async () => {
		await startMatch();

		for (let i = 0; i < 2; i++) {
			const event = await api.matches({ id: ctx.matchId }).events.post(
				{
					teamId: ctx.homeTeamId,
					periodNumber: 1,
					minuteOrSecond: 30 + i,
					eventType: "goal",
				},
				{ headers: await h(ctx.referee) },
			);
			expect(event.status).toBe(200);
		}

		const [match] = await db
			.select()
			.from(matches)
			.where(eq(matches.id, ctx.matchId))
			.limit(1);
		expect(match?.homeScore).toBe(2);
		expect(match?.awayScore).toBe(0);
	});

	it("evento de equipo no participante → 400", async () => {
		await startMatch();
		const outsider = await seedTeam();

		const { status } = await api.matches({ id: ctx.matchId }).events.post(
			{
				teamId: outsider.id,
				periodNumber: 1,
				minuteOrSecond: 5,
				eventType: "goal",
			},
			{ headers: await h(ctx.referee) },
		);
		expect(status).toBe(400);
	});

	it("evento con partido no in_progress → 400", async () => {
		const { status } = await api.matches({ id: ctx.matchId }).events.post(
			{
				teamId: ctx.homeTeamId,
				periodNumber: 1,
				minuteOrSecond: 5,
				eventType: "goal",
			},
			{ headers: await h(ctx.referee) },
		);
		expect(status).toBe(400);
	});

	it("PATCH info rechaza status 'finished' (solo organizer cancela)", async () => {
		const response = await app.handle(
			new Request(`http://localhost/matches/${ctx.matchId}`, {
				method: "PATCH",
				headers: {
					authorization: `Bearer ${await (await import("./helpers/auth")).signToken(ctx.organizer.id, ctx.organizer.role)}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ status: "finished" }),
			}),
		);
		expect(response.status).toBe(400);
	});

	it("PATCH con equipos no inscritos en la etapa → 400", async () => {
		const outsiderA = await seedTeam();
		const outsiderB = await seedTeam();

		const { status } = await api
			.matches({ id: ctx.matchId })
			.patch(
				{ homeTeamId: outsiderA.id, awayTeamId: outsiderB.id },
				{ headers: await h(ctx.organizer) },
			);
		expect(status).toBe(400);
	});
});

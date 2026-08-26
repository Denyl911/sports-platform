import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { stageStandings, tournamentMembers } from "@sports/db/tables";
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
	seedStage,
	seedTeam,
	seedTournament,
	seedUser,
} from "./helpers/db";

const api = treaty(app);

// Contexto compartido del fixture
interface Fixture {
	admin: UserRow;
	superAdmin: UserRow;
	globalOrganizer: UserRow;
	tournamentId: string;
	editionId: string;
	stageId: string;
	groupId: string;
	matchId: string;
	registrationId: string;
	rosterEntryId: string;
	standingRowId: string;
	refereeMemberId: string;
	memberOrganizer: UserRow;
	memberReferee: UserRow;
	memberStatistician: UserRow;
	memberViewer: UserRow;
}

let fx: Fixture;

beforeEach(async () => {
	await resetDb();

	const [admin, superAdmin, globalOrganizer] = await Promise.all([
		seedUser({ role: "admin" }),
		seedUser({ role: "super_admin" }),
		seedUser({ role: "organizer" }),
	]);

	const tournament = await seedTournament();
	const edition = await seedEdition(tournament.id);
	const stage = await seedStage(edition.id);
	const group = await seedGroup(stage.id);
	const match = await seedMatch(stage.id, { groupId: group.id });

	const [memberOrganizer, memberReferee, memberStatistician, memberViewer] =
		await Promise.all([
			seedUser({ role: "viewer_staff" }),
			seedUser({ role: "viewer_staff" }),
			seedUser({ role: "viewer_staff" }),
			seedUser({ role: "viewer_staff" }),
		]);
	await Promise.all([
		seedMember(tournament.id, memberOrganizer.id, "organizer"),
		seedMember(tournament.id, memberReferee.id, "referee"),
		seedMember(tournament.id, memberStatistician.id, "statistician"),
		seedMember(tournament.id, memberViewer.id, "viewer_staff"),
	]);

	const teamA = await seedTeam();
	const reg = await seedRegistration(stage.id, teamA.id);

	// Recurso roster entry (creado por el organizer miembro)
	const player = await api.players.post(
		{ firstName: "R", lastName: "Bac" },
		{ headers: await authHeaders(admin) },
	);
	if (!player.data) throw new Error("no player");
	const roster = await api
		.editions({ editionId: edition.id })
		.teams({ teamId: teamA.id })
		.roster.post(
			{ playerId: player.data.id },
			{ headers: await authHeaders(memberOrganizer) },
		);
	if (!roster.data) throw new Error("no roster");

	// Recurso standing row
	const [row] = await db
		.insert(stageStandings)
		.values({ groupId: group.id, teamId: teamA.id })
		.returning();

	// Membresía del referee (para el test de membresías)
	const [refereeMembership] = await db
		.select()
		.from(tournamentMembers)
		.where(eq(tournamentMembers.userId, memberReferee.id))
		.limit(1);
	if (!refereeMembership) throw new Error("no referee membership");

	fx = {
		admin,
		superAdmin,
		globalOrganizer,
		tournamentId: tournament.id,
		editionId: edition.id,
		stageId: stage.id,
		groupId: group.id,
		matchId: match.id,
		registrationId: reg.id,
		rosterEntryId: roster.data.id,
		standingRowId: row?.id ?? "",
		refereeMemberId: refereeMembership.id,
		memberOrganizer,
		memberReferee,
		memberStatistician,
		memberViewer,
	};
});

function h(user: UserRow) {
	return authHeaders(user);
}

describe("rbac - escritura global", () => {
	it("POST /sports: solo admin y super_admin", async () => {
		const body = { id: `sp-${crypto.randomUUID().slice(0, 8)}`, name: "X" };
		expect(
			(await api.sports.post(body, { headers: await h(fx.admin) })).status,
		).toBe(200);
		expect(
			(await api.sports.post(body, { headers: await h(fx.superAdmin) })).status,
		).toBe(409); // mismo id → pasa el guard, choca con unique
		expect(
			(await api.sports.post(body, { headers: await h(fx.globalOrganizer) }))
				.status,
		).toBe(403);
		expect((await api.sports.post(body)).status).toBe(401);
	});

	it("POST /clubs: admin u organizer global", async () => {
		const body = { name: `Club ${crypto.randomUUID().slice(0, 6)}` };
		expect(
			(await api.clubs.post(body, { headers: await h(fx.admin) })).status,
		).toBe(200);
		expect(
			(await api.clubs.post(body, { headers: await h(fx.globalOrganizer) }))
				.status,
		).toBe(409);
	});
});

describe("rbac - recursos scoped al torneo", () => {
	it("organizer miembro gestiona el partido; un organizer ajeno no", async () => {
		const ok = await api
			.matches({ id: fx.matchId })
			.patch({ roundNumber: 2 }, { headers: await h(fx.memberOrganizer) });
		expect(ok.status).toBe(200);

		const foreign = await seedUser({ role: "viewer_staff" });
		const denied = await api
			.matches({ id: fx.matchId })
			.patch({ roundNumber: 3 }, { headers: await h(foreign) });
		expect(denied.status).toBe(403);
	});

	it("referee miembro actualiza marcador; viewer miembro no", async () => {
		const start = await api
			.matches({ id: fx.matchId })
			.score.patch(
				{ homeScore: 1, awayScore: 0, status: "in_progress" },
				{ headers: await h(fx.memberReferee) },
			);
		expect(start.status).toBe(200);

		const score = await api
			.matches({ id: fx.matchId })
			.score.patch(
				{ homeScore: 2, awayScore: 0, status: "in_progress" },
				{ headers: await h(fx.memberReferee) },
			);
		expect(score.status).toBe(200);

		const denied = await api
			.matches({ id: fx.matchId })
			.score.patch(
				{ homeScore: 3, awayScore: 0, status: "in_progress" },
				{ headers: await h(fx.memberViewer) },
			);
		expect(denied.status).toBe(403);
	});

	it("statistician miembro recalcula standings; referee miembro no", async () => {
		const ok = await api
			.groups({ groupId: fx.groupId })
			.standings.recalculate.post(undefined, {
				headers: await h(fx.memberStatistician),
			});
		expect(ok.status).toBe(200);

		const denied = await api
			.groups({ groupId: fx.groupId })
			.standings.recalculate.post(undefined, {
				headers: await h(fx.memberReferee),
			});
		expect(denied.status).toBe(403);
	});

	it("statistician ajusta fila manual de standings", async () => {
		const ok = await api
			.standings({ id: fx.standingRowId })
			.patch({ points: 99 }, { headers: await h(fx.memberStatistician) });
		expect(ok.status).toBe(200);
	});

	it("organizer miembro inscribe equipos en su etapa; statistician no", async () => {
		const team = await seedTeam();
		const ok = await api
			.stages({ stageId: fx.stageId })
			.registrations.post(
				{ teamId: team.id },
				{ headers: await h(fx.memberOrganizer) },
			);
		expect(ok.status).toBe(200);

		const denied = await api
			.stages({ stageId: fx.stageId })
			.registrations.post(
				{ teamId: team.id },
				{ headers: await h(fx.memberStatistician) },
			);
		expect(denied.status).toBe(403);
	});

	it("organizer miembro administra membresías de SU torneo; organizer ajeno no", async () => {
		const ok = await api
			.memberships({ memberId: fx.refereeMemberId })
			.patch(
				{ role: "statistician" },
				{ headers: await h(fx.memberOrganizer) },
			);
		expect(ok.status).toBe(200);

		const foreign = await seedUser({ role: "organizer" });
		const denied = await api
			.memberships({ memberId: fx.refereeMemberId })
			.patch({ role: "viewer_staff" }, { headers: await h(foreign) });
		expect(denied.status).toBe(403);
	});

	it("roster item: organizer miembro edita; viewer no", async () => {
		const ok = await api
			.rosters({ id: fx.rosterEntryId })
			.patch({ jerseyNumber: 10 }, { headers: await h(fx.memberOrganizer) });
		expect(ok.status).toBe(200);

		const denied = await api
			.rosters({ id: fx.rosterEntryId })
			.patch({ jerseyNumber: 11 }, { headers: await h(fx.memberViewer) });
		expect(denied.status).toBe(403);
	});

	it("registro: solo organizer miembro elimina", async () => {
		const denied = await api
			.registrations({ id: fx.registrationId })
			.delete(undefined, {
				headers: await h(fx.memberReferee),
			});
		expect(denied.status).toBe(403);

		const ok = await api
			.registrations({ id: fx.registrationId })
			.delete(undefined, {
				headers: await h(fx.memberOrganizer),
			});
		expect(ok.status).toBe(200);
	});
});

describe("rbac - lectura pública sin token", () => {
	it("GETs públicos responden 200 sin autenticación", async () => {
		expect((await api.matches.get({ query: {} })).status).toBe(200);
		expect((await api.tournaments.get()).status).toBe(200);
		expect((await api.sports.get()).status).toBe(200);
		expect(
			(await api.tournaments({ tournamentId: fx.tournamentId }).editions.get())
				.status,
		).toBe(200);
		expect(
			(await api.stages({ stageId: fx.stageId }).registrations.get()).status,
		).toBe(200);
		expect(
			(await api.groups({ groupId: fx.groupId }).standings.get()).status,
		).toBe(200);
	});

	it("GETs protegidos exigen token", async () => {
		expect((await api.users.get()).status).toBe(401);
	});
});

import { reset } from "drizzle-seed";
import { db } from "@sports/db";
import {
	clubs,
	sports,
	stageGroups,
	stageTeamRegistrations,
	tournamentEditions,
	tournamentStages,
	tournaments,
	teams,
	users,
} from "@sports/db/tables";

// Limpia las tablas base (TRUNCATE ... CASCADE vía drizzle-seed:
// el cascade vacía también standings, rosters, matches, etc.)
export async function resetDb() {
	await reset(db, {
		users,
		sports,
		tournaments,
		tournamentEditions,
		tournamentStages,
		stageGroups,
		clubs,
		teams,
	});
}

let counter = 0;
const unique = () => `${Date.now().toString(36)}-${++counter}`;

export type UserRow = typeof users.$inferSelect;
export type TeamRow = typeof teams.$inferSelect;

// ==========================================
// Factories deterministas: inserts explícitos
// (RBAC requiere roles/emails exactos, no datos aleatorios)
// ==========================================

export async function seedUser(
	opts: Partial<{
		email: string;
		fullName: string;
		role: UserRow["role"];
		isActive: boolean;
		password: string;
	}> = {},
): Promise<UserRow> {
	const [user] = await db
		.insert(users)
		.values({
			email: opts.email ?? `user-${unique()}@test.local`,
			fullName: opts.fullName ?? "Test User",
			role: opts.role ?? "viewer_staff",
			isActive: opts.isActive ?? true,
			passwordHash: await Bun.password.hash(opts.password ?? "password123"),
		})
		.returning();
	return user;
}

export async function seedSport(id?: string) {
	const [sport] = await db
		.insert(sports)
		.values({ id: id ?? `sport-${unique()}`, name: `Sport ${unique()}` })
		.returning();
	return sport;
}

export async function seedTournament(sportId?: string) {
	const sport = sportId ?? (await seedSport()).id;
	const [tournament] = await db
		.insert(tournaments)
		.values({
			sportId: sport,
			name: `Tournament ${unique()}`,
		})
		.returning();
	return tournament;
}

export async function seedEdition(tournamentId: string) {
	const [edition] = await db
		.insert(tournamentEditions)
		.values({
			tournamentId,
			name: `Edition ${unique()}`,
			category: "open",
			status: "in_progress",
		})
		.returning();
	return edition;
}

export async function seedStage(editionId: string) {
	const [stage] = await db
		.insert(tournamentStages)
		.values({
			editionId,
			name: `Stage ${unique()}`,
			stageType: "round_robin",
		})
		.returning();
	return stage;
}

export async function seedGroup(stageId: string) {
	const [group] = await db
		.insert(stageGroups)
		.values({ stageId, name: `Group ${unique()}` })
		.returning();
	return group;
}

export async function seedTeam(name?: string): Promise<TeamRow> {
	const [club] = await db
		.insert(clubs)
		.values({ name: `Club ${unique()}` })
		.returning();
	const [team] = await db
		.insert(teams)
		.values({
			clubId: club.id,
			name: name ?? `Team ${unique()}`,
			category: "open",
		})
		.returning();
	return team;
}

// Inscripción de un equipo en la etapa (requisito para participantes de partido)
export async function seedRegistration(stageId: string, teamId: string) {
	const [registration] = await db
		.insert(stageTeamRegistrations)
		.values({ stageId, teamId })
		.returning();
	return registration;
}

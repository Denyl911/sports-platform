import { db } from "@sports/db";
import {
	clubs,
	matches,
	players,
	sportEventTypes,
	sports,
	stageGroups,
	stageStandings,
	stageTeamRegistrations,
	teams,
	tournamentEditions,
	tournamentMembers,
	tournamentRosters,
	tournamentStages,
	tournaments,
	users,
	venues,
} from "@sports/db/tables";
import { and, eq, sql } from "drizzle-orm";
import { reset } from "drizzle-seed";

// Limpia las tablas base (TRUNCATE ... CASCADE vía drizzle-seed)
export async function resetDb() {
	await reset(db, {
		users,
		sports,
		venues,
		clubs,
		teams,
		players,
		sportEventTypes,
		tournaments,
		tournamentEditions,
		tournamentStages,
		stageGroups,
		stageTeamRegistrations,
		tournamentRosters,
		matches,
		stageStandings,
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

export async function seedSport(id?: string, hasDraws = true) {
	const [sport] = await db
		.insert(sports)
		.values({
			id: id ?? `sport-${unique()}`,
			name: `Sport ${unique()}`,
			hasDraws,
		})
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

export async function seedEdition(
	tournamentId: string,
	overrides: Partial<{
		status: (typeof tournamentEditions.$inferSelect)["status"];
		startDate: string | null;
		endDate: string | null;
		name: string;
		category: string;
	}> = {},
) {
	const [edition] = await db
		.insert(tournamentEditions)
		.values({
			tournamentId,
			name: overrides.name ?? `Edition ${unique()}`,
			category: overrides.category ?? "open",
			status: overrides.status ?? "draft",
			...(overrides.startDate !== undefined
				? { startDate: overrides.startDate }
				: {}),
			...(overrides.endDate !== undefined
				? { endDate: overrides.endDate }
				: {}),
		})
		.returning();
	return edition;
}

export async function seedStage(
	editionId: string,
	sequenceOrder?: number,
	stageType: (typeof tournamentStages.$inferSelect)["stageType"] = "round_robin",
) {
	// Secuencia automática si no se indica (evita chocar con stage_sequence_unique)
	const order =
		sequenceOrder ??
		((
			await db
				.select({
					max: sql<number>`coalesce(max(${tournamentStages.sequenceOrder}), 0)`,
				})
				.from(tournamentStages)
				.where(eq(tournamentStages.editionId, editionId))
		)[0]?.max ?? 0) + 1;

	const [stage] = await db
		.insert(tournamentStages)
		.values({
			editionId,
			name: `Stage ${unique()}`,
			stageType,
			sequenceOrder: order,
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

// Inscripción de un equipo en la etapa (idempotente)
export async function seedRegistration(
	stageId: string,
	teamId: string,
	groupId?: string,
) {
	await db
		.insert(stageTeamRegistrations)
		.values({ stageId, teamId, groupId: groupId ?? null })
		.onConflictDoNothing();
	const [registration] = await db
		.select()
		.from(stageTeamRegistrations)
		.where(
			and(
				eq(stageTeamRegistrations.stageId, stageId),
				eq(stageTeamRegistrations.teamId, teamId),
			),
		)
		.limit(1);
	if (!registration) throw new Error("registration not found");
	// Si se pide grupo y la inscripción ya existía sin él, se asigna.
	if (groupId && registration.groupId !== groupId) {
		await db
			.update(stageTeamRegistrations)
			.set({ groupId })
			.where(eq(stageTeamRegistrations.id, registration.id));
	}
	return registration;
}

// Membresía RBAC de un usuario en un torneo
export async function seedMember(
	tournamentId: string,
	userId: string,
	role: "organizer" | "referee" | "statistician" | "viewer_staff",
) {
	const [member] = await db
		.insert(tournamentMembers)
		.values({ tournamentId, userId, role })
		.returning();
	return member;
}

// Tipo de evento puntuable en el catálogo del deporte
export async function seedEventType(
	sportId: string,
	code = "goal",
	affectsScore = true,
) {
	const [eventType] = await db
		.insert(sportEventTypes)
		.values({
			sportId,
			code,
			name: code,
			affectsScore,
			defaultValue: 1,
		})
		.returning();
	return eventType;
}

export async function seedPlayer(
	overrides: Partial<{
		firstName: string;
		lastName: string;
		birthDate: string | null;
		idCardNumber: string | null;
	}> = {},
) {
	const [player] = await db
		.insert(players)
		.values({
			firstName: overrides.firstName ?? `First${unique()}`,
			lastName: overrides.lastName ?? `Last${unique()}`,
			birthDate: overrides.birthDate ?? null,
			idCardNumber: overrides.idCardNumber ?? `ID-${unique()}`,
		})
		.returning();
	return player;
}

export async function seedVenue(
	overrides: Partial<{
		name: string;
		address: string;
		fieldCount: number;
	}> = {},
) {
	const [venue] = await db
		.insert(venues)
		.values({
			name: overrides.name ?? `Venue ${unique()}`,
			address: overrides.address ?? null,
			fieldCount: overrides.fieldCount ?? 1,
		})
		.returning();
	return venue;
}

export async function seedRoster(
	editionId: string,
	teamId: string,
	playerId: string,
	overrides: Partial<{
		jerseyNumber: number | null;
		position: string | null;
		isCaptain: boolean;
	}> = {},
) {
	const [entry] = await db
		.insert(tournamentRosters)
		.values({
			editionId,
			teamId,
			playerId,
			jerseyNumber: overrides.jerseyNumber ?? null,
			position: overrides.position ?? null,
			isCaptain: overrides.isCaptain ?? false,
		})
		.returning();
	return entry;
}

type MatchRow = typeof matches.$inferSelect;

// Partido entre dos equipos inscritos en la etapa
export async function seedMatch(
	stageId: string,
	opts: Partial<{
		groupId: string | null;
		homeTeamId: string;
		awayTeamId: string;
		status: MatchRow["status"];
		homeScore: number;
		awayScore: number;
		winnerTeamId: string | null;
	}> = {},
): Promise<MatchRow> {
	const home = opts.homeTeamId ?? (await seedTeam()).id;
	const away = opts.awayTeamId ?? (await seedTeam()).id;
	await seedRegistration(stageId, home);
	if (away !== home) await seedRegistration(stageId, away);

	const [match] = await db
		.insert(matches)
		.values({
			stageId,
			groupId: opts.groupId ?? null,
			homeTeamId: home,
			awayTeamId: away,
			status: opts.status ?? "scheduled",
			...(opts.homeScore !== undefined || opts.awayScore !== undefined
				? {
						homeScore: opts.homeScore ?? 0,
						awayScore: opts.awayScore ?? 0,
					}
				: {}),
			winnerTeamId: opts.winnerTeamId ?? null,
		})
		.returning();
	return match;
}

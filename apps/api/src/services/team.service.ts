import { count, and, asc, eq, ilike } from "drizzle-orm";
import { db } from "@sports/db";
import { clubs, teams } from "@sports/db/tables";
import type {
	Club,
	InsertClub,
	InsertTeam,
	TeamFilterQuery,
	UpdateClub,
	UpdateTeam,
} from "@sports/schemas";
import { DomainError } from "./errors";

// ==========================================
// Clubes
// ==========================================

export async function listClubs() {
	const [items, totalRows] = await Promise.all([
		db.select().from(clubs).orderBy(asc(clubs.name)),
		db.select({ count: count() }).from(clubs),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findClubById(id: string): Promise<Club> {
	const [club] = await db.select().from(clubs).where(eq(clubs.id, id)).limit(1);

	if (!club) throw DomainError.notFound(`Club '${id}' not found`);
	return club;
}

export async function createClub(data: InsertClub) {
	const [existing] = await db
		.select({ id: clubs.id })
		.from(clubs)
		.where(eq(clubs.name, data.name))
		.limit(1);

	if (existing)
		throw DomainError.conflict(`Club '${data.name}' already exists`);

	const [created] = await db.insert(clubs).values(data).returning();
	return created;
}

export async function updateClub(id: string, data: UpdateClub) {
	await findClubById(id);

	const [updated] = await db
		.update(clubs)
		.set(data)
		.where(eq(clubs.id, id))
		.returning();

	return updated;
}

export async function deleteClub(id: string) {
	await findClubById(id);
	await db.delete(clubs).where(eq(clubs.id, id));
}

// ==========================================
// Equipos
// ==========================================

export async function listTeams(filter: TeamFilterQuery) {
	const conditions = [];
	if (filter.clubId) conditions.push(eq(teams.clubId, filter.clubId));
	if (filter.category) conditions.push(ilike(teams.category, filter.category));
	const where = conditions.length ? and(...conditions) : undefined;

	const [items, totalRows] = await Promise.all([
		db.select().from(teams).where(where).orderBy(asc(teams.name)),
		db.select({ count: count() }).from(teams).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findTeamById(id: string) {
	const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);

	if (!team) throw DomainError.notFound(`Team '${id}' not found`);
	return team;
}

export async function createTeam(data: InsertTeam) {
	if (data.clubId) await findClubById(data.clubId);

	const [created] = await db.insert(teams).values(data).returning();
	return created;
}

export async function updateTeam(id: string, data: UpdateTeam) {
	await findTeamById(id);

	if (data.clubId !== null && data.clubId) await findClubById(data.clubId);

	const [updated] = await db
		.update(teams)
		.set(data)
		.where(eq(teams.id, id))
		.returning();

	return updated;
}

export async function deleteTeam(id: string) {
	await findTeamById(id);
	await db.delete(teams).where(eq(teams.id, id));
}

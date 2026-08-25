import { desc, eq } from "drizzle-orm";
import { db } from "@sports/db";
import { sports, tournaments } from "@sports/db/tables";
import type { InsertTournament, UpdateTournament } from "@sports/schemas";
import { DomainError } from "./errors";

export async function listTournaments(sportId?: string) {
	const query = db.select().from(tournaments).$dynamic();
	if (sportId) query.where(eq(tournaments.sportId, sportId));
	return query.orderBy(desc(tournaments.createdAt));
}

export async function findTournamentById(id: string) {
	const [tournament] = await db
		.select()
		.from(tournaments)
		.where(eq(tournaments.id, id))
		.limit(1);

	if (!tournament) throw DomainError.notFound(`Tournament '${id}' not found`);
	return tournament;
}

async function assertSportExists(sportId: string) {
	const [sport] = await db
		.select({ id: sports.id })
		.from(sports)
		.where(eq(sports.id, sportId))
		.limit(1);

	if (!sport) throw DomainError.badRequest(`Sport '${sportId}' not found`);
}

export async function createTournament(data: InsertTournament) {
	await assertSportExists(data.sportId);
	const [created] = await db.insert(tournaments).values(data).returning();
	return created;
}

export async function updateTournament(id: string, data: UpdateTournament) {
	await findTournamentById(id);
	if (data.sportId) await assertSportExists(data.sportId);

	const [updated] = await db
		.update(tournaments)
		.set(data)
		.where(eq(tournaments.id, id))
		.returning();

	return updated;
}

export async function deleteTournament(id: string) {
	await findTournamentById(id);
	await db.delete(tournaments).where(eq(tournaments.id, id));
}

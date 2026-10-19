import { db } from "@sports/db";
import { sports, tournaments } from "@sports/db/tables";
import type {
	InsertTournament,
	TournamentFilterQuery,
	UpdateTournament,
} from "@sports/schemas";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { DomainError } from "./errors";

export async function listTournaments(filter: TournamentFilterQuery) {
	const conditions = [];
	if (filter.sportId) conditions.push(eq(tournaments.sportId, filter.sportId));
	const where = conditions.length ? and(...conditions) : undefined;

	// Orden por defecto: más reciente primero; sort=name agrupa por nombre.
	// El id desempata para que las páginas no se pisen.
	let itemsQuery = db
		.select()
		.from(tournaments)
		.where(where)
		.$dynamic()
		.orderBy(
			filter.sort === "name"
				? filter.order === "desc"
					? desc(tournaments.name)
					: asc(tournaments.name)
				: filter.order === "asc"
					? asc(tournaments.createdAt)
					: desc(tournaments.createdAt),
			asc(tournaments.id),
		);
	if (filter.limit !== undefined) itemsQuery = itemsQuery.limit(filter.limit);
	if (filter.offset !== undefined)
		itemsQuery = itemsQuery.offset(filter.offset);

	const [items, totalRows] = await Promise.all([
		itemsQuery,
		db.select({ count: count() }).from(tournaments).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
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

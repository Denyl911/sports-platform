import { db } from "@sports/db";
import { players } from "@sports/db/tables";
import type {
	InsertPlayer,
	PlayerSearchQuery,
	UpdatePlayer,
} from "@sports/schemas";
import { and, asc, count, eq, ilike, ne, or } from "drizzle-orm";
import { DomainError } from "./errors";

export async function listPlayers(filter: PlayerSearchQuery) {
	// La búsqueda pisa apellido o nombre (antes sólo apellido); el orden
	// natural es apellido+nombre y el id desempata las páginas.
	const where = filter.search
		? or(
				ilike(players.lastName, `%${filter.search}%`),
				ilike(players.firstName, `%${filter.search}%`),
			)
		: undefined;

	let itemsQuery = db
		.select()
		.from(players)
		.where(where)
		.$dynamic()
		.orderBy(asc(players.lastName), asc(players.firstName), asc(players.id));
	if (filter.limit !== undefined) itemsQuery = itemsQuery.limit(filter.limit);
	if (filter.offset !== undefined)
		itemsQuery = itemsQuery.offset(filter.offset);

	const [items, totalRows] = await Promise.all([
		itemsQuery,
		db.select({ count: count() }).from(players).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findPlayerById(id: string) {
	const [player] = await db
		.select()
		.from(players)
		.where(eq(players.id, id))
		.limit(1);

	if (!player) throw DomainError.notFound(`Player '${id}' not found`);
	return player;
}

export async function createPlayer(data: InsertPlayer) {
	if (data.idCardNumber) {
		const [existing] = await db
			.select({ id: players.id })
			.from(players)
			.where(eq(players.idCardNumber, data.idCardNumber))
			.limit(1);

		if (existing)
			throw DomainError.conflict(
				`Player with ID card '${data.idCardNumber}' already exists`,
			);
	}

	const [created] = await db.insert(players).values(data).returning();
	return created;
}

export async function updatePlayer(id: string, data: UpdatePlayer) {
	await findPlayerById(id);

	if (data.idCardNumber) {
		const [duplicate] = await db
			.select({ id: players.id })
			.from(players)
			.where(
				and(eq(players.idCardNumber, data.idCardNumber), ne(players.id, id)),
			)
			.limit(1);

		if (duplicate)
			throw DomainError.conflict(
				`Player with ID card '${data.idCardNumber}' already exists`,
			);
	}

	const [updated] = await db
		.update(players)
		.set(data)
		.where(eq(players.id, id))
		.returning();

	return updated;
}

export async function deletePlayer(id: string) {
	await findPlayerById(id);
	await db.delete(players).where(eq(players.id, id));
}

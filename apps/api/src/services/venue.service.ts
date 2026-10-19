import { db } from "@sports/db";
import { venues } from "@sports/db/tables";
import type {
	InsertVenue,
	UpdateVenue,
	VenueFilterQuery,
} from "@sports/schemas";
import { asc, count, desc, eq, ilike } from "drizzle-orm";
import { DomainError } from "./errors";

export async function listVenues(filter: VenueFilterQuery) {
	// search recorta el nombre (ilike, sin case); `order` invierte el orden
	// natural y el id desempata las páginas.
	const where = filter.search
		? ilike(venues.name, `%${filter.search}%`)
		: undefined;
	let itemsQuery = db
		.select()
		.from(venues)
		.where(where)
		.$dynamic()
		.orderBy(
			filter.order === "desc" ? desc(venues.name) : asc(venues.name),
			asc(venues.id),
		);
	if (filter.limit !== undefined) itemsQuery = itemsQuery.limit(filter.limit);
	if (filter.offset !== undefined)
		itemsQuery = itemsQuery.offset(filter.offset);

	const [items, totalRows] = await Promise.all([
		itemsQuery,
		db.select({ count: count() }).from(venues).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findVenueById(id: string) {
	const [venue] = await db
		.select()
		.from(venues)
		.where(eq(venues.id, id))
		.limit(1);

	if (!venue) throw DomainError.notFound(`Venue '${id}' not found`);
	return venue;
}

export async function createVenue(data: InsertVenue) {
	const [created] = await db.insert(venues).values(data).returning();
	return created;
}

export async function updateVenue(id: string, data: UpdateVenue) {
	await findVenueById(id);

	const [updated] = await db
		.update(venues)
		.set(data)
		.where(eq(venues.id, id))
		.returning();

	return updated;
}

export async function deleteVenue(id: string) {
	await findVenueById(id);
	await db.delete(venues).where(eq(venues.id, id));
}

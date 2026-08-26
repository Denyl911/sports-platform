import { db } from "@sports/db";
import { venues } from "@sports/db/tables";
import type { InsertVenue, UpdateVenue } from "@sports/schemas";
import { asc, count, eq } from "drizzle-orm";
import { DomainError } from "./errors";

export async function listVenues() {
	const [items, totalRows] = await Promise.all([
		db.select().from(venues).orderBy(asc(venues.name)),
		db.select({ count: count() }).from(venues),
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

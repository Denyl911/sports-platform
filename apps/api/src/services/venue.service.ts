import { asc, eq } from "drizzle-orm";
import { db } from "@sports/db";
import { venues } from "@sports/db/tables";
import type { InsertVenue, UpdateVenue } from "@sports/schemas";
import { DomainError } from "./errors";

export async function listVenues() {
	return db.select().from(venues).orderBy(asc(venues.name));
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

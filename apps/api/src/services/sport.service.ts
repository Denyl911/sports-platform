import { db } from "@sports/db";
import { sportEventTypes, sports } from "@sports/db/tables";
import type {
	InsertSport,
	InsertSportEventType,
	SportEventTypeFilterQuery,
	SportFilterQuery,
	UpdateSport,
	UpdateSportEventType,
} from "@sports/schemas";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { DomainError } from "./errors";

// ==========================================
// Deportes
// ==========================================

export async function listSports(filter: SportFilterQuery) {
	// search recorta el nombre (ilike, sin case); `order` invierte el orden
	// natural y el id desempata las páginas.
	const where = filter.search
		? ilike(sports.name, `%${filter.search}%`)
		: undefined;
	let itemsQuery = db
		.select()
		.from(sports)
		.where(where)
		.$dynamic()
		.orderBy(
			filter.order === "desc" ? desc(sports.name) : asc(sports.name),
			asc(sports.id),
		);
	if (filter.limit !== undefined) itemsQuery = itemsQuery.limit(filter.limit);
	if (filter.offset !== undefined)
		itemsQuery = itemsQuery.offset(filter.offset);

	const [items, totalRows] = await Promise.all([
		itemsQuery,
		db.select({ count: count() }).from(sports).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findSportById(id: string) {
	const [sport] = await db
		.select()
		.from(sports)
		.where(eq(sports.id, id))
		.limit(1);

	if (!sport) throw DomainError.notFound(`Sport '${id}' not found`);
	return sport;
}

export async function createSport(data: InsertSport) {
	const [existing] = await db
		.select({ id: sports.id })
		.from(sports)
		.where(eq(sports.id, data.id))
		.limit(1);

	if (existing) throw DomainError.conflict(`Sport '${data.id}' already exists`);

	const [created] = await db.insert(sports).values(data).returning();
	return created;
}

export async function updateSport(id: string, data: UpdateSport) {
	await findSportById(id);

	const [updated] = await db
		.update(sports)
		.set(data)
		.where(eq(sports.id, id))
		.returning();

	return updated;
}

export async function deleteSport(id: string) {
	await findSportById(id);
	await db.delete(sports).where(eq(sports.id, id));
}

// ==========================================
// Catálogo de tipos de evento por deporte
// ==========================================

export async function listSportEventTypes(filter: SportEventTypeFilterQuery) {
	const conditions = [eq(sportEventTypes.sportId, filter.sportId)];
	if (filter.affectsScore !== undefined) {
		conditions.push(eq(sportEventTypes.affectsScore, filter.affectsScore));
	}
	const where = and(...conditions);

	const [items, totalRows] = await Promise.all([
		db
			.select()
			.from(sportEventTypes)
			.where(where)
			.orderBy(asc(sportEventTypes.code)),
		db.select({ count: count() }).from(sportEventTypes).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findSportEventTypeById(id: string) {
	const [eventType] = await db
		.select()
		.from(sportEventTypes)
		.where(eq(sportEventTypes.id, id))
		.limit(1);

	if (!eventType)
		throw DomainError.notFound(`Sport event type '${id}' not found`);
	return eventType;
}

export async function createSportEventType(data: InsertSportEventType) {
	await findSportById(data.sportId);

	const [existing] = await db
		.select({ id: sportEventTypes.id })
		.from(sportEventTypes)
		.where(
			and(
				eq(sportEventTypes.sportId, data.sportId),
				eq(sportEventTypes.code, data.code),
			),
		)
		.limit(1);

	if (existing)
		throw DomainError.conflict(
			`Event type code '${data.code}' already exists for sport '${data.sportId}'`,
		);

	const [created] = await db.insert(sportEventTypes).values(data).returning();
	return created;
}

export async function updateSportEventType(
	id: string,
	data: UpdateSportEventType,
) {
	await findSportEventTypeById(id);

	const [updated] = await db
		.update(sportEventTypes)
		.set(data)
		.where(eq(sportEventTypes.id, id))
		.returning();

	return updated;
}

export async function deleteSportEventType(id: string) {
	await findSportEventTypeById(id);
	await db.delete(sportEventTypes).where(eq(sportEventTypes.id, id));
}

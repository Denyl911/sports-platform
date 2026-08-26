import { db } from "@sports/db";
import { tournamentEditions, tournaments } from "@sports/db/tables";
import type {
	InsertTournamentEdition,
	UpdateTournamentEdition,
} from "@sports/schemas";
import { asc, count, eq } from "drizzle-orm";
import { DomainError } from "./errors";

// Transiciones válidas de estado de una edición
const EDITION_STATUS_TRANSITIONS: Record<string, string[]> = {
	draft: ["registration", "cancelled"],
	registration: ["in_progress", "cancelled"],
	in_progress: ["finished", "cancelled"],
	finished: ["archived"],
	archived: [],
	cancelled: [],
};

export async function listEditionsByTournament(tournamentId: string) {
	await assertTournamentExists(tournamentId);

	const [items, totalRows] = await Promise.all([
		db
			.select()
			.from(tournamentEditions)
			.where(eq(tournamentEditions.tournamentId, tournamentId))
			.orderBy(asc(tournamentEditions.startDate)),
		db
			.select({ count: count() })
			.from(tournamentEditions)
			.where(eq(tournamentEditions.tournamentId, tournamentId)),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findEditionById(id: string) {
	const [edition] = await db
		.select()
		.from(tournamentEditions)
		.where(eq(tournamentEditions.id, id))
		.limit(1);

	if (!edition) throw DomainError.notFound(`Edition '${id}' not found`);
	return edition;
}

export async function createEdition(data: InsertTournamentEdition) {
	await assertTournamentExists(data.tournamentId);
	validateDates(data.startDate ?? null, data.endDate ?? null);

	const [created] = await db
		.insert(tournamentEditions)
		.values(data)
		.returning();
	return created;
}

export async function updateEdition(id: string, data: UpdateTournamentEdition) {
	const edition = await findEditionById(id);

	if (data.status && data.status !== edition.status) {
		assertStatusTransition(edition.status, data.status);
	}

	const startDate = data.startDate ?? edition.startDate;
	const endDate = data.endDate ?? edition.endDate;
	validateDates(startDate, endDate);

	const [updated] = await db
		.update(tournamentEditions)
		.set(data)
		.where(eq(tournamentEditions.id, id))
		.returning();

	return updated;
}

export async function deleteEdition(id: string) {
	await findEditionById(id);
	await db.delete(tournamentEditions).where(eq(tournamentEditions.id, id));
}

async function assertTournamentExists(tournamentId: string) {
	const [tournament] = await db
		.select({ id: tournaments.id })
		.from(tournaments)
		.where(eq(tournaments.id, tournamentId))
		.limit(1);

	if (!tournament)
		throw DomainError.badRequest(`Tournament '${tournamentId}' not found`);
}

function validateDates(startDate: string | null, endDate: string | null): void {
	if (!startDate || !endDate) return;

	const start = new Date(startDate);
	const end = new Date(endDate);

	// Validación real de fechas: inmune a formatos mixtos (date-only vs datetime)
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
		throw DomainError.badRequest(
			"Invalid date format for startDate or endDate",
		);
	}
	if (start.getTime() > end.getTime()) {
		throw DomainError.badRequest(
			"startDate must be before or equal to endDate",
		);
	}
}

function assertStatusTransition(current: string, next: string): void {
	if (current === next) return;
	const allowed = EDITION_STATUS_TRANSITIONS[current] ?? [];
	if (!allowed.includes(next)) {
		throw DomainError.badRequest(
			`Invalid edition status transition: '${current}' -> '${next}'`,
		);
	}
}

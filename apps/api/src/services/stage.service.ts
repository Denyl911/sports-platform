import { db } from "@sports/db";
import {
	stageGroups,
	stageTeamRegistrations,
	tournamentEditions,
	tournamentStages,
} from "@sports/db/tables";
import type {
	InsertStageGroup,
	InsertTournamentStage,
	UpdateStageGroup,
	UpdateTournamentStage,
} from "@sports/schemas";
import { and, asc, count, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { DomainError } from "./errors";

// ==========================================
// Etapas del torneo
// ==========================================

export async function listStagesByEdition(editionId: string) {
	await assertEditionExists(editionId);

	const where = eq(tournamentStages.editionId, editionId);
	const [items, totalRows] = await Promise.all([
		db
			.select()
			.from(tournamentStages)
			.where(where)
			.orderBy(asc(tournamentStages.sequenceOrder)),
		db.select({ count: count() }).from(tournamentStages).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findStageById(id: string) {
	const [stage] = await db
		.select()
		.from(tournamentStages)
		.where(eq(tournamentStages.id, id))
		.limit(1);

	if (!stage) throw DomainError.notFound(`Stage '${id}' not found`);
	return stage;
}

export async function createStage(data: InsertTournamentStage) {
	await assertEditionExists(data.editionId);

	const sequenceOrder = data.sequenceOrder ?? 1;
	const [duplicate] = await db
		.select({ id: tournamentStages.id })
		.from(tournamentStages)
		.where(
			and(
				eq(tournamentStages.editionId, data.editionId),
				eq(tournamentStages.sequenceOrder, sequenceOrder),
			),
		)
		.limit(1);

	if (duplicate)
		throw DomainError.conflict(
			`Stage with sequence order '${sequenceOrder}' already exists in this edition`,
		);

	const [created] = await db.insert(tournamentStages).values(data).returning();
	return created;
}

export async function updateStage(id: string, data: UpdateTournamentStage) {
	await findStageById(id);

	const [updated] = await db
		.update(tournamentStages)
		.set(data)
		.where(eq(tournamentStages.id, id))
		.returning();

	return updated;
}

export async function deleteStage(id: string) {
	await findStageById(id);
	await db.delete(tournamentStages).where(eq(tournamentStages.id, id));
}

export async function reorderStages(editionId: string, stageIds: string[]) {
	await assertEditionExists(editionId);

	const stages = await db
		.select({ id: tournamentStages.id })
		.from(tournamentStages)
		.where(eq(tournamentStages.editionId, editionId));
	const existingIds = new Set(stages.map((s) => s.id));

	for (const id of stageIds) {
		if (!existingIds.has(id)) {
			throw DomainError.badRequest(`Stage '${id}' not in edition`);
		}
	}

	await db.transaction(async (tx) => {
		for (let i = 0; i < stageIds.length; i++) {
			await tx
				.update(tournamentStages)
				.set({ sequenceOrder: i + 1 })
				.where(eq(tournamentStages.id, stageIds[i]!));
		}
	});
}

// ==========================================
// Grupos de una etapa
// ==========================================

export async function listGroupsByStage(stageId: string) {
	await findStageById(stageId);

	const where = eq(stageGroups.stageId, stageId);
	const [items, totalRows] = await Promise.all([
		db.select().from(stageGroups).where(where).orderBy(asc(stageGroups.name)),
		db.select({ count: count() }).from(stageGroups).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findNextStage(editionId: string, sequenceOrder: number) {
	const [stage] = await db
		.select()
		.from(tournamentStages)
		.where(
			and(
				eq(tournamentStages.editionId, editionId),
				gt(tournamentStages.sequenceOrder, sequenceOrder),
			),
		)
		.orderBy(asc(tournamentStages.sequenceOrder))
		.limit(1);
	return stage ?? null;
}

export async function findPreviousStage(
	editionId: string,
	sequenceOrder: number,
) {
	const [stage] = await db
		.select()
		.from(tournamentStages)
		.where(
			and(
				eq(tournamentStages.editionId, editionId),
				lt(tournamentStages.sequenceOrder, sequenceOrder),
			),
		)
		.orderBy(desc(tournamentStages.sequenceOrder))
		.limit(1);
	return stage ?? null;
}

export async function findGroupById(id: string) {
	const [group] = await db
		.select()
		.from(stageGroups)
		.where(eq(stageGroups.id, id))
		.limit(1);

	if (!group) throw DomainError.notFound(`Group '${id}' not found`);
	return group;
}

export async function createGroup(data: InsertStageGroup) {
	await findStageById(data.stageId);

	const [duplicate] = await db
		.select({ id: stageGroups.id })
		.from(stageGroups)
		.where(
			and(
				eq(stageGroups.stageId, data.stageId),
				eq(stageGroups.name, data.name),
			),
		)
		.limit(1);

	if (duplicate)
		throw DomainError.conflict(
			`Group '${data.name}' already exists in this stage`,
		);

	const [created] = await db.insert(stageGroups).values(data).returning();
	return created;
}

export async function updateGroup(id: string, data: UpdateStageGroup) {
	await findGroupById(id);

	const [updated] = await db
		.update(stageGroups)
		.set(data)
		.where(eq(stageGroups.id, id))
		.returning();

	return updated;
}

export async function deleteGroup(id: string) {
	await findGroupById(id);
	await db.delete(stageGroups).where(eq(stageGroups.id, id));
}

/**
 * Reparte al azar los equipos **sin grupo** entre los grupos de la etapa.
 *
 * Si la etapa no tiene grupos, crea `numGroups` con nombres A, B, C… y reparte
 * a todos los inscritos. Si ya tiene grupos, no crea ni renombra nada: solo
 * completa los huecos, para que una distribución manual nunca se pise por
 * accidente. Devuelve los grupos resultantes y cuántos equipos se movieron.
 */
export async function autoCreateGroups(stageId: string, numGroups?: number) {
	await findStageById(stageId);

	const [existingGroups, registrations] = await Promise.all([
		db
			.select()
			.from(stageGroups)
			.where(eq(stageGroups.stageId, stageId))
			.orderBy(asc(stageGroups.name)),
		db
			.select({
				id: stageTeamRegistrations.id,
				groupId: stageTeamRegistrations.groupId,
			})
			.from(stageTeamRegistrations)
			.where(eq(stageTeamRegistrations.stageId, stageId)),
	]);

	let groups = existingGroups;
	let created = 0;

	if (groups.length === 0) {
		if (numGroups == null) {
			throw DomainError.badRequest("Indica cuántos grupos hay que crear");
		}
		if (!Number.isInteger(numGroups) || numGroups < 2 || numGroups > 26) {
			throw DomainError.badRequest(
				"La cantidad de grupos debe estar entre 2 y 26",
			);
		}
		if (registrations.length < numGroups) {
			throw DomainError.badRequest(
				`Hay ${registrations.length} equipos inscritos y no alcanzan para ${numGroups} grupos`,
			);
		}

		groups = await db.transaction(async (tx) => {
			const rows = [];
			for (let i = 0; i < numGroups; i++) {
				const [group] = await tx
					.insert(stageGroups)
					.values({ stageId, name: String.fromCharCode(65 + i) })
					.returning();
				rows.push(group!);
			}
			return rows;
		});
		created = groups.length;
	}

	// Reparto equilibrado: cada equipo libre va al grupo con menos equipos.
	// El desempate es el orden de nombre, así que A recibe el primero.
	const counts = new Map<string, number>(groups.map((g) => [g.id, 0]));
	for (const registration of registrations) {
		if (registration.groupId && counts.has(registration.groupId)) {
			const current = counts.get(registration.groupId) ?? 0;
			counts.set(registration.groupId, current + 1);
		}
	}

	const free = shuffle(
		registrations.filter((registration) => registration.groupId === null),
	);
	const assignments = new Map<string, string[]>();
	for (const registration of free) {
		let target = groups[0]!;
		for (const group of groups) {
			if ((counts.get(group.id) ?? 0) < (counts.get(target.id) ?? 0)) {
				target = group;
			}
		}
		const ids = assignments.get(target.id) ?? [];
		ids.push(registration.id);
		assignments.set(target.id, ids);
		counts.set(target.id, (counts.get(target.id) ?? 0) + 1);
	}

	if (assignments.size > 0) {
		await db.transaction(async (tx) => {
			for (const [groupId, ids] of assignments) {
				await tx
					.update(stageTeamRegistrations)
					.set({ groupId })
					.where(inArray(stageTeamRegistrations.id, ids));
			}
		});
	}

	return { groups, created, assigned: free.length };
}

/** Fisher–Yates: un `sort` con `Math.random` no es una mezcla uniforme. */
function shuffle<T>(items: T[]): T[] {
	const copy = [...items];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const current = copy[i]!;
		copy[i] = copy[j]!;
		copy[j] = current;
	}
	return copy;
}

// ==========================================
// Helpers
// ==========================================

async function assertEditionExists(editionId: string) {
	const [edition] = await db
		.select({ id: tournamentEditions.id })
		.from(tournamentEditions)
		.where(eq(tournamentEditions.id, editionId))
		.limit(1);

	if (!edition)
		throw DomainError.badRequest(`Edition '${editionId}' not found`);
	return edition;
}

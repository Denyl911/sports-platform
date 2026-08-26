import { and, asc, eq } from "drizzle-orm";
import { db } from "@sports/db";
import {
	stageGroups,
	tournamentEditions,
	tournamentStages,
} from "@sports/db/tables";
import type {
	InsertStageGroup,
	InsertTournamentStage,
	UpdateStageGroup,
	UpdateTournamentStage,
} from "@sports/schemas";
import { DomainError } from "./errors";

// ==========================================
// Etapas del torneo
// ==========================================

export async function listStagesByEdition(editionId: string) {
	await assertEditionExists(editionId);

	return db
		.select()
		.from(tournamentStages)
		.where(eq(tournamentStages.editionId, editionId))
		.orderBy(asc(tournamentStages.sequenceOrder));
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

// ==========================================
// Grupos de una etapa
// ==========================================

export async function listGroupsByStage(stageId: string) {
	await findStageById(stageId);

	return db
		.select()
		.from(stageGroups)
		.where(eq(stageGroups.stageId, stageId))
		.orderBy(asc(stageGroups.name));
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

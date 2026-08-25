import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db } from "@sports/db";
import { stageTeamRegistrations, teams } from "@sports/db/tables";
import type { RegisterTeamInStage } from "@sports/schemas";
import { DomainError } from "./errors";
import { findGroupById, findStageById } from "./stage.service";
import { findTeamById } from "./team.service";

export async function listRegistrationsByStage(stageId: string) {
	await findStageById(stageId);

	return db
		.select({
			registration: stageTeamRegistrations,
			team: teams,
		})
		.from(stageTeamRegistrations)
		.innerJoin(teams, eq(stageTeamRegistrations.teamId, teams.id))
		.where(eq(stageTeamRegistrations.stageId, stageId))
		.orderBy(asc(stageTeamRegistrations.seedNumber), asc(teams.name));
}

export async function listRegistrationsByGroup(groupId: string) {
	return db
		.select({
			registration: stageTeamRegistrations,
			team: teams,
		})
		.from(stageTeamRegistrations)
		.innerJoin(teams, eq(stageTeamRegistrations.teamId, teams.id))
		.where(
			and(
				eq(stageTeamRegistrations.groupId, groupId),
				isNotNull(stageTeamRegistrations.groupId),
			),
		)
		.orderBy(asc(stageTeamRegistrations.seedNumber), asc(teams.name));
}

export async function findRegistrationById(id: string) {
	const [registration] = await db
		.select()
		.from(stageTeamRegistrations)
		.where(eq(stageTeamRegistrations.id, id))
		.limit(1);

	if (!registration)
		throw DomainError.notFound(`Registration '${id}' not found`);
	return registration;
}

export async function registerTeamInStage(data: RegisterTeamInStage) {
	const stage = await findStageById(data.stageId);
	await findTeamById(data.teamId);

	// Un equipo no puede repetirse en la misma etapa
	const [duplicate] = await db
		.select({ id: stageTeamRegistrations.id })
		.from(stageTeamRegistrations)
		.where(
			and(
				eq(stageTeamRegistrations.stageId, data.stageId),
				eq(stageTeamRegistrations.teamId, data.teamId),
			),
		)
		.limit(1);

	if (duplicate)
		throw DomainError.conflict(
			`Team '${data.teamId}' is already registered in stage '${data.stageId}'`,
		);

	// Si se asigna grupo, debe pertenecer a la misma etapa
	if (data.groupId) {
		const group = await findGroupById(data.groupId);
		if (group.stageId !== stage.id) {
			throw DomainError.badRequest(
				`Group '${data.groupId}' does not belong to stage '${stage.id}'`,
			);
		}
	}

	const [created] = await db
		.insert(stageTeamRegistrations)
		.values({
			stageId: data.stageId,
			groupId: data.groupId ?? null,
			teamId: data.teamId,
			seedNumber: data.seedNumber ?? null,
		})
		.returning();

	return created;
}

export async function updateRegistrationGroup(id: string, groupId?: string) {
	const registration = await findRegistrationById(id);

	if (groupId) {
		const group = await findGroupById(groupId);
		if (group.stageId !== registration.stageId) {
			throw DomainError.badRequest(
				`Group '${groupId}' does not belong to stage '${registration.stageId}'`,
			);
		}
	}

	const [updated] = await db
		.update(stageTeamRegistrations)
		.set({ groupId: groupId ?? null })
		.where(eq(stageTeamRegistrations.id, id))
		.returning();

	return updated;
}

export async function unregisterTeam(id: string) {
	await findRegistrationById(id);
	await db
		.delete(stageTeamRegistrations)
		.where(eq(stageTeamRegistrations.id, id));
}

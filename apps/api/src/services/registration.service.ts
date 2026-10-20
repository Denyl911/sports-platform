import { db } from "@sports/db";
import { stageTeamRegistrations, teams } from "@sports/db/tables";
import type {
	RegisterTeamInStage,
	RegistrationGroupUpdate,
} from "@sports/schemas";
import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";
import { DomainError } from "./errors";
import { findGroupById, findStageById } from "./stage.service";
import { findTeamById } from "./team.service";

// Orden de las filas dentro de un grupo: la posición manual manda; lo que
// nunca se movió cae a la semilla y al nombre. `nulls last` mantiene las filas
// nuevas al final sin reescribir posiciones ajenas.
const byGroupPosition = [
	sql`${stageTeamRegistrations.position} asc nulls last`,
	asc(stageTeamRegistrations.seedNumber),
	asc(teams.name),
] as const;

export async function listRegistrationsByStage(stageId: string) {
	await findStageById(stageId);

	const where = eq(stageTeamRegistrations.stageId, stageId);
	const orderBy = [
		asc(stageTeamRegistrations.seedNumber),
		asc(teams.name),
	] as const;

	const [items, totalRows] = await Promise.all([
		db
			.select({ registration: stageTeamRegistrations, team: teams })
			.from(stageTeamRegistrations)
			.innerJoin(teams, eq(stageTeamRegistrations.teamId, teams.id))
			.where(where)
			.orderBy(...orderBy),
		db.select({ count: count() }).from(stageTeamRegistrations).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function listRegistrationsByGroup(groupId: string) {
	const where = and(
		eq(stageTeamRegistrations.groupId, groupId),
		isNotNull(stageTeamRegistrations.groupId),
	);

	const [items, totalRows] = await Promise.all([
		db
			.select({ registration: stageTeamRegistrations, team: teams })
			.from(stageTeamRegistrations)
			.innerJoin(teams, eq(stageTeamRegistrations.teamId, teams.id))
			.where(where)
			.orderBy(...byGroupPosition),
		db.select({ count: count() }).from(stageTeamRegistrations).where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
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

export async function updateRegistrationGroup(
	id: string,
	data: RegistrationGroupUpdate,
) {
	const registration = await findRegistrationById(id);
	const targetGroupId =
		data.groupId === undefined ? registration.groupId : data.groupId;

	if (targetGroupId) {
		const group = await findGroupById(targetGroupId);
		if (group.stageId !== registration.stageId) {
			throw DomainError.badRequest(
				`Group '${targetGroupId}' does not belong to stage '${registration.stageId}'`,
			);
		}
	}

	const groupChanged = targetGroupId !== registration.groupId;
	if (!groupChanged && data.position === undefined) return registration;

	return db.transaction(async (tx) => {
		// Ids del grupo en su orden visible (posición manual, semilla, nombre).
		const idsInGroup = async (groupId: string) =>
			(
				await tx
					.select({ id: stageTeamRegistrations.id })
					.from(stageTeamRegistrations)
					.innerJoin(teams, eq(stageTeamRegistrations.teamId, teams.id))
					.where(
						and(
							eq(stageTeamRegistrations.stageId, registration.stageId),
							eq(stageTeamRegistrations.groupId, groupId),
						),
					)
					.orderBy(...byGroupPosition)
			).map((row) => row.id);

		if (targetGroupId) {
			// Insertar en el índice pedido y renumerar el grupo entero: así una
			// posición nunca choca con otra ni deja huecos.
			const targetIds = (await idsInGroup(targetGroupId)).filter(
				(rowId) => rowId !== id,
			);
			const insertAt = Math.min(
				Math.max(data.position ?? targetIds.length, 0),
				targetIds.length,
			);
			const ordered = [
				...targetIds.slice(0, insertAt),
				id,
				...targetIds.slice(insertAt),
			];

			for (const [index, rowId] of ordered.entries()) {
				await tx
					.update(stageTeamRegistrations)
					.set(
						index === insertAt
							? { groupId: targetGroupId, position: index }
							: { position: index },
					)
					.where(eq(stageTeamRegistrations.id, rowId));
			}
		} else {
			await tx
				.update(stageTeamRegistrations)
				.set({ groupId: null, position: null })
				.where(eq(stageTeamRegistrations.id, id));
		}

		// El grupo de origen se cierra sin el equipo: renumerar para no dejar
		// el hueco de la fila que se fue.
		if (registration.groupId && registration.groupId !== targetGroupId) {
			const remaining = await idsInGroup(registration.groupId);
			for (const [index, rowId] of remaining.entries()) {
				await tx
					.update(stageTeamRegistrations)
					.set({ position: index })
					.where(eq(stageTeamRegistrations.id, rowId));
			}
		}

		const [updated] = await tx
			.select()
			.from(stageTeamRegistrations)
			.where(eq(stageTeamRegistrations.id, id))
			.limit(1);
		if (!updated) {
			throw DomainError.notFound(`Registration '${id}' not found`);
		}
		return updated;
	});
}

export async function unregisterTeam(id: string) {
	await findRegistrationById(id);
	await db
		.delete(stageTeamRegistrations)
		.where(eq(stageTeamRegistrations.id, id));
}

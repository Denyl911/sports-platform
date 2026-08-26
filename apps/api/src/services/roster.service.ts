import { count, and, asc, eq } from "drizzle-orm";
import { db } from "@sports/db";
import {
	players,
	teams,
	tournamentEditions,
	tournamentRosters,
} from "@sports/db/tables";
import type {
	AddPlayerToRoster,
	UpdateTournamentRoster,
} from "@sports/schemas";
import { DomainError } from "./errors";
import { findPlayerById } from "./player.service";
import { findTeamById } from "./team.service";

export async function listRoster(editionId: string, teamId: string) {
	await assertTeamExists(teamId);

	const where = and(
		eq(tournamentRosters.editionId, editionId),
		eq(tournamentRosters.teamId, teamId),
	);
	const orderBy = [
		asc(tournamentRosters.jerseyNumber),
		asc(players.lastName),
	] as const;

	const [items, totalRows] = await Promise.all([
		db
			.select({ roster: tournamentRosters, player: players })
			.from(tournamentRosters)
			.innerJoin(players, eq(tournamentRosters.playerId, players.id))
			.where(where)
			.orderBy(...orderBy),
		db
			.select({ count: count() })
			.from(tournamentRosters)
			.where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findRosterEntryById(id: string) {
	const [entry] = await db
		.select()
		.from(tournamentRosters)
		.where(eq(tournamentRosters.id, id))
		.limit(1);

	if (!entry) throw DomainError.notFound(`Roster entry '${id}' not found`);
	return entry;
}

export async function addPlayerToRoster(data: AddPlayerToRoster) {
	await assertEditionExists(data.editionId);
	await findTeamById(data.teamId);
	const player = await findPlayerById(data.playerId);

	// El jugador no puede repetirse en el mismo plantel
	const [duplicate] = await db
		.select({ id: tournamentRosters.id })
		.from(tournamentRosters)
		.where(
			and(
				eq(tournamentRosters.editionId, data.editionId),
				eq(tournamentRosters.teamId, data.teamId),
				eq(tournamentRosters.playerId, data.playerId),
			),
		)
		.limit(1);

	if (duplicate)
		throw DomainError.conflict(
			`Player '${player.id}' is already in the roster of team '${data.teamId}' for this edition`,
		);

	// Un solo capitán por plantel
	if (data.isCaptain) {
		await assertNoExistingCaptain(data.editionId, data.teamId);
	}

	// El dorsal no debe estar tomado por otro jugador del mismo plantel
	if (data.jerseyNumber !== undefined && data.jerseyNumber !== null) {
		const [takenNumber] = await db
			.select({ id: tournamentRosters.id })
			.from(tournamentRosters)
			.where(
				and(
					eq(tournamentRosters.editionId, data.editionId),
					eq(tournamentRosters.teamId, data.teamId),
					eq(tournamentRosters.jerseyNumber, data.jerseyNumber),
				),
			)
			.limit(1);

		if (takenNumber)
			throw DomainError.conflict(
				`Jersey number '${data.jerseyNumber}' is already taken in team '${data.teamId}' for this edition`,
			);
	}

	const [created] = await db.insert(tournamentRosters).values(data).returning();
	return created;
}

export async function updateRosterEntry(
	id: string,
	data: UpdateTournamentRoster,
) {
	const entry = await findRosterEntryById(id);

	if (data.isCaptain) {
		await assertNoExistingCaptain(entry.editionId, entry.teamId);
	}

	if (data.jerseyNumber !== undefined && data.jerseyNumber !== null) {
		const [takenNumber] = await db
			.select({ id: tournamentRosters.id })
			.from(tournamentRosters)
			.where(
				and(
					eq(tournamentRosters.editionId, entry.editionId),
					eq(tournamentRosters.teamId, entry.teamId),
					eq(tournamentRosters.jerseyNumber, data.jerseyNumber),
				),
			)
			.limit(1);

		if (takenNumber && takenNumber.id !== id)
			throw DomainError.conflict(
				`Jersey number '${data.jerseyNumber}' is already taken in this roster`,
			);
	}

	const [updated] = await db
		.update(tournamentRosters)
		.set(data)
		.where(eq(tournamentRosters.id, id))
		.returning();

	return updated;
}

export async function removePlayerFromRoster(id: string) {
	await findRosterEntryById(id);
	await db.delete(tournamentRosters).where(eq(tournamentRosters.id, id));
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
}

async function assertTeamExists(teamId: string) {
	const [team] = await db
		.select({ id: teams.id })
		.from(teams)
		.where(eq(teams.id, teamId))
		.limit(1);

	if (!team) throw DomainError.badRequest(`Team '${teamId}' not found`);
}

async function assertNoExistingCaptain(editionId: string, teamId: string) {
	const [existing] = await db
		.select({ id: tournamentRosters.id })
		.from(tournamentRosters)
		.where(
			and(
				eq(tournamentRosters.editionId, editionId),
				eq(tournamentRosters.teamId, teamId),
				eq(tournamentRosters.isCaptain, true),
			),
		)
		.limit(1);

	if (existing)
		throw DomainError.conflict(
			`Team already has a captain for this edition. Demote them before assigning another.`,
		);
}

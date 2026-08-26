import { db } from "@sports/db";
import {
	matches,
	stageGroups,
	stageStandings,
	stageTeamRegistrations,
	tournamentEditions,
	tournamentMembers,
	tournamentStages,
	tournaments,
} from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { DomainError } from "./errors";

// Resuelve el torneo al que pertenece un partido (para guards RBAC)
export async function getMatchTournamentId(matchId: string): Promise<string> {
	const [row] = await db
		.select({ tournamentId: tournaments.id })
		.from(matches)
		.innerJoin(tournamentStages, eq(matches.stageId, tournamentStages.id))
		.innerJoin(
			tournamentEditions,
			eq(tournamentStages.editionId, tournamentEditions.id),
		)
		.innerJoin(tournaments, eq(tournamentEditions.tournamentId, tournaments.id))
		.where(eq(matches.id, matchId))
		.limit(1);

	if (!row) throw DomainError.notFound(`Match '${matchId}' not found`);
	return row.tournamentId;
}

export async function getEditionTournamentId(
	editionId: string,
): Promise<string> {
	const [row] = await db
		.select({ tournamentId: tournamentEditions.tournamentId })
		.from(tournamentEditions)
		.where(eq(tournamentEditions.id, editionId))
		.limit(1);

	if (!row) throw DomainError.notFound(`Edition '${editionId}' not found`);
	return row.tournamentId;
}

export async function getStageTournamentId(stageId: string): Promise<string> {
	const [row] = await db
		.select({ tournamentId: tournamentEditions.tournamentId })
		.from(tournamentStages)
		.innerJoin(
			tournamentEditions,
			eq(tournamentStages.editionId, tournamentEditions.id),
		)
		.where(eq(tournamentStages.id, stageId))
		.limit(1);

	if (!row) throw DomainError.notFound(`Stage '${stageId}' not found`);
	return row.tournamentId;
}

export async function getGroupTournamentId(groupId: string): Promise<string> {
	const [row] = await db
		.select({ tournamentId: tournamentEditions.tournamentId })
		.from(stageGroups)
		.innerJoin(tournamentStages, eq(stageGroups.stageId, tournamentStages.id))
		.innerJoin(
			tournamentEditions,
			eq(tournamentStages.editionId, tournamentEditions.id),
		)
		.where(eq(stageGroups.id, groupId))
		.limit(1);

	if (!row) throw DomainError.notFound(`Group '${groupId}' not found`);
	return row.tournamentId;
}

// Resuelve el torneo desde una inscripción (stage_team_registrations)
export async function getRegistrationTournamentId(
	registrationId: string,
): Promise<string> {
	const [row] = await db
		.select({ stageId: stageTeamRegistrations.stageId })
		.from(stageTeamRegistrations)
		.where(eq(stageTeamRegistrations.id, registrationId))
		.limit(1);

	if (!row)
		throw DomainError.notFound(`Registration '${registrationId}' not found`);
	return getStageTournamentId(row.stageId);
}

// Resuelve el torneo desde una membresía (tournament_members)
export async function getMembershipTournamentId(
	memberId: string,
): Promise<string> {
	const [row] = await db
		.select({ tournamentId: tournamentMembers.tournamentId })
		.from(tournamentMembers)
		.where(eq(tournamentMembers.id, memberId))
		.limit(1);

	if (!row)
		throw DomainError.notFound(`Tournament member '${memberId}' not found`);
	return row.tournamentId;
}

// Resuelve el torneo desde una fila de posiciones
export async function getStandingRowTournamentId(
	rowId: string,
): Promise<string> {
	const [row] = await db
		.select({ groupId: stageStandings.groupId })
		.from(stageStandings)
		.where(eq(stageStandings.id, rowId))
		.limit(1);

	if (!row) throw DomainError.notFound(`Standing row '${rowId}' not found`);
	return getGroupTournamentId(row.groupId);
}

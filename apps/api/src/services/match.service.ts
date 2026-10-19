import { db } from "@sports/db";
import {
	matchEvents,
	matches,
	matchPeriods,
	sportEventTypes,
	stageTeamRegistrations,
	teams,
	tournamentEditions,
	tournamentStages,
	tournaments,
} from "@sports/db/tables";
import type {
	CreateMatch,
	MatchFilterQuery,
	PaginatedResponse,
	RecordLiveEvent,
	UpdateMatchInfo,
	UpdateMatchScore,
} from "@sports/schemas";
import { and, asc, count, eq, getTableColumns, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { publishMatch } from "../lib/live";
import { advanceBracketWinner, syncAdvancement } from "./advancement.service";
import { DomainError } from "./errors";
import { getStageTournamentId } from "./scoped-ids.service";
import { findGroupById, findStageById } from "./stage.service";
import { recalculateGroupStandings } from "./standings.service";
import { findTeamById } from "./team.service";
import { findVenueById } from "./venue.service";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Identidad de los participantes en el listado: la fila de la lista paga los
// participantes con dos LEFT JOIN con alias (mismo round trip), no con
// consultas cliente-side (ADR 008 — la fila de GET /matches sigue en 2).
type MatchListItem = typeof matches.$inferSelect & {
	homeTeam: Pick<typeof teams.$inferSelect, "id" | "name"> | null;
	awayTeam: Pick<typeof teams.$inferSelect, "id" | "name"> | null;
};

// Transiciones válidas de estado de un partido
const MATCH_STATUS_TRANSITIONS: Record<string, string[]> = {
	scheduled: ["in_progress", "cancelled", "walkover"],
	in_progress: ["paused", "finished", "cancelled", "walkover"],
	paused: ["in_progress", "finished", "cancelled", "walkover"],
	finished: [],
	cancelled: [],
	walkover: [],
};

export function assertMatchStatusTransition(
	current: string,
	next: string,
): void {
	if (current === next) return;
	const allowed = MATCH_STATUS_TRANSITIONS[current] ?? [];
	if (!allowed.includes(next)) {
		throw DomainError.badRequest(
			`Invalid match status transition: '${current}' -> '${next}'`,
		);
	}
}

const MATCH_RELATIONS = {
	periods: true,
	events: true,
	homeTeam: true,
	awayTeam: true,
	winnerTeam: true,
	venue: true,
	// El deporte del partido viaja por la cadena etapa → edición → torneo
	// dentro de la misma lectura: el detalle sigue pagando una consulta
	// (ADR 008, `query-budgets.test.ts`). Se aplana al shape del contrato.
	stage: {
		with: {
			edition: {
				with: { tournament: { columns: { sportId: true } } },
			},
		},
	},
} as const;

// ==========================================
// Consultas
// ==========================================

export async function listMatches(
	filter: MatchFilterQuery,
): Promise<PaginatedResponse<MatchListItem>> {
	const conditions = [];
	if (filter.stageId) conditions.push(eq(matches.stageId, filter.stageId));
	if (filter.groupId) conditions.push(eq(matches.groupId, filter.groupId));
	if (filter.status) conditions.push(eq(matches.status, filter.status));
	// Scope por edición o torneo: join con la cadena de padres
	if (filter.editionId)
		conditions.push(eq(tournamentStages.editionId, filter.editionId));
	if (filter.tournamentId)
		conditions.push(eq(tournamentEditions.tournamentId, filter.tournamentId));

	const where = conditions.length ? and(...conditions) : undefined;
	const needsScopeJoin = Boolean(filter.editionId || filter.tournamentId);

	const homeTeams = alias(teams, "home_team");
	const awayTeams = alias(teams, "away_team");

	const itemSelection = {
		...getTableColumns(matches),
		homeTeam: { id: homeTeams.id, name: homeTeams.name },
		awayTeam: { id: awayTeams.id, name: awayTeams.name },
	};
	const orderBy = [
		asc(matches.roundNumber),
		asc(matches.matchNumber),
		asc(matches.scheduledAt),
	];

	// Left join: un partido de llave puede no tener equipos definidos aún.
	const baseItems = db
		.select(itemSelection)
		.from(matches)
		.leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
		.leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id));

	const itemsQuery = (
		needsScopeJoin
			? baseItems
					.innerJoin(tournamentStages, eq(matches.stageId, tournamentStages.id))
					.innerJoin(
						tournamentEditions,
						eq(tournamentStages.editionId, tournamentEditions.id),
					)
			: baseItems
	)
		.where(where)
		.orderBy(...orderBy)
		.limit(filter.limit ?? 20)
		.offset(filter.offset ?? 0);

	const totalQuery = needsScopeJoin
		? db
				.select({ count: count() })
				.from(matches)
				.innerJoin(tournamentStages, eq(matches.stageId, tournamentStages.id))
				.innerJoin(
					tournamentEditions,
					eq(tournamentStages.editionId, tournamentEditions.id),
				)
				.where(where)
		: db.select({ count: count() }).from(matches).where(where);

	const [items, totalRows] = await Promise.all([itemsQuery, totalQuery]);
	return { items, total: totalRows[0]?.count ?? 0 };
}

export async function findMatchById(id: string) {
	const match = await db.query.matches.findFirst({
		where: { id },
		with: MATCH_RELATIONS,
	});

	if (!match) throw DomainError.notFound(`Match '${id}' not found`);

	// La etapa existe por FK y cuelga de la edición y del torneo: si la cadena
	// no tiene deporte, el partido no está bien formado.
	const { stage, ...matchFields } = match;
	const sportId = stage?.edition?.tournament?.sportId;
	if (!sportId) throw DomainError.notFound(`Match '${id}' not found`);

	return { ...matchFields, sportId };
}

// ==========================================
// CRUD
// ==========================================

export async function createMatch(data: CreateMatch) {
	const stage = await findStageById(data.stageId);

	// Integridad: la etapa debe pertenecer al torneo indicado
	const stageTournamentId = await getStageTournamentId(stage.id);
	if (stageTournamentId !== data.tournamentId) {
		throw DomainError.badRequest(
			`Stage '${data.stageId}' does not belong to tournament '${data.tournamentId}'`,
		);
	}

	if (data.groupId) {
		const group = await findGroupById(data.groupId);
		if (group.stageId !== data.stageId) {
			throw DomainError.badRequest(
				`Group '${data.groupId}' does not belong to stage '${data.stageId}'`,
			);
		}
	}

	if (!data.homeTeamId || !data.awayTeamId) {
		// En llaves los equipos pueden definirse después, pero si viene uno debe venir el otro
		if (Boolean(data.homeTeamId) !== Boolean(data.awayTeamId)) {
			throw DomainError.badRequest(
				"Both homeTeamId and awayTeamId are required to define participants",
			);
		}
	} else {
		await assertParticipantTeams(data.homeTeamId, data.awayTeamId);
	}

	if (data.winnerTeamId) assertWinnerIsParticipant(data, data.winnerTeamId);

	const [created] = await db
		.insert(matches)
		.values(toMatchRow(data))
		.returning();
	return created;
}

export async function updateMatch(id: string, data: UpdateMatchInfo) {
	const match = await findMatchById(id);

	if (data.status && data.status !== match.status) {
		assertMatchStatusTransition(match.status, data.status);
	}

	// Cambio de participantes: deben venir juntos, existir y estar inscritos en la etapa
	if ((data.homeTeamId !== undefined) !== (data.awayTeamId !== undefined)) {
		throw DomainError.badRequest(
			"Both homeTeamId and awayTeamId are required to define participants",
		);
	}

	const finalHome = data.homeTeamId ?? match.homeTeamId;
	const finalAway = data.awayTeamId ?? match.awayTeamId;

	if (data.homeTeamId && data.awayTeamId) {
		await findTeamById(data.homeTeamId);
		await findTeamById(data.awayTeamId);
		await assertTeamsRegisteredInStage(
			match.stageId,
			data.homeTeamId,
			data.awayTeamId,
		);
	}

	if (data.groupId) {
		const group = await findGroupById(data.groupId);
		if (group.stageId !== match.stageId) {
			throw DomainError.badRequest(
				`Group '${data.groupId}' does not belong to stage '${match.stageId}'`,
			);
		}
	}

	if (data.venueId) await findVenueById(data.venueId);

	// El ganador que ya no sea participante (post-cambio de equipos) se limpia
	const winnerInvalid =
		match.winnerTeamId &&
		finalHome &&
		finalAway &&
		match.winnerTeamId !== finalHome &&
		match.winnerTeamId !== finalAway;

	const [updated] = await db
		.update(matches)
		.set({
			...toMatchRow(data),
			...(winnerInvalid ? { winnerTeamId: null } : {}),
		})
		.where(eq(matches.id, id))
		.returning();

	return updated;
}

export async function deleteMatch(id: string) {
	await assertMatchExists(id);
	await db.delete(matches).where(eq(matches.id, id));
}

// ==========================================
// Marcador en vivo (transaccional)
// ==========================================

export async function updateMatchScore(id: string, payload: UpdateMatchScore) {
	const updated = await db.transaction(async (tx) => {
		const match = await getMatchOrThrow(tx, id);

		assertMatchStatusTransition(match.status, payload.status);

		// Walkover exige ganador explícito
		if (payload.status === "walkover" && !payload.winnerTeamId) {
			throw DomainError.badRequest(
				"winnerTeamId is required when status is 'walkover'",
			);
		}

		if (payload.winnerTeamId) {
			assertWinnerIsParticipant(match, payload.winnerTeamId);
		}

		// Snapshot del periodo en curso (el cliente envía el marcador acumulado vigente)
		const [periodInfo] = await tx
			.select({
				maxPeriod: sql<number>`coalesce(max(${matchPeriods.periodNumber}), 0)::int`,
			})
			.from(matchPeriods)
			.where(eq(matchPeriods.matchId, id));
		const currentPeriod =
			payload.periodNumber ?? Math.max(periodInfo?.maxPeriod ?? 0, 1);
		const periodType = payload.periodType ?? "regular";

		await tx
			.insert(matchPeriods)
			.values({
				matchId: id,
				periodNumber: currentPeriod,
				periodType,
				homeScore: payload.homeScore,
				awayScore: payload.awayScore,
			})
			.onConflictDoUpdate({
				target: [
					matchPeriods.matchId,
					matchPeriods.periodNumber,
					matchPeriods.periodType,
				],
				set: { homeScore: payload.homeScore, awayScore: payload.awayScore },
			});

		const winnerTeamId = resolveWinner(payload, match);

		const [row] = await tx
			.update(matches)
			.set({
				homeScore: payload.homeScore,
				awayScore: payload.awayScore,
				status: payload.status,
				...(winnerTeamId === undefined ? {} : { winnerTeamId }),
			})
			.where(eq(matches.id, id))
			.returning();

		return row;
	});

	await recalculateStandingsIfFinished(id);
	await syncAdvancement(updated.stageId).catch(() => undefined);
	// Propagar el ganador al siguiente partido de la llave (si la hay). Lanza
	// 409 si el siguiente ya empezó y el ganador cambió.
	await advanceBracketWinner(id);
	publishMatch(id, { type: "score", matchId: id, payload: updated });
	return updated;
}

// ==========================================
// Eventos en vivo (transaccional)
// ==========================================

export async function recordLiveEvent(
	matchId: string,
	payload: RecordLiveEvent,
) {
	const event = await db.transaction(async (tx) => {
		const match = await getMatchOrThrow(tx, matchId);

		if (match.status !== "in_progress") {
			throw DomainError.badRequest(
				`Match '${matchId}' is not in progress (status: '${match.status}')`,
			);
		}

		// El equipo que registra el evento debe ser participante
		if (
			payload.teamId !== match.homeTeamId &&
			payload.teamId !== match.awayTeamId
		) {
			throw DomainError.badRequest(
				`Team '${payload.teamId}' does not participate in match '${matchId}'`,
			);
		}

		// El tipo de evento debe existir en el catálogo del deporte del torneo
		const sportId = await getMatchSportId(tx, matchId);
		const [eventType] = await tx
			.select()
			.from(sportEventTypes)
			.where(
				and(
					eq(sportEventTypes.sportId, sportId),
					eq(sportEventTypes.code, payload.eventType),
				),
			)
			.limit(1);

		if (!eventType) {
			throw DomainError.badRequest(
				`Unknown event type '${payload.eventType}' for sport '${sportId}'`,
			);
		}

		const [event] = await tx
			.insert(matchEvents)
			.values({
				matchId,
				teamId: payload.teamId,
				playerId: payload.playerId ?? null,
				assistPlayerId: payload.assistPlayerId ?? null,
				periodNumber: payload.periodNumber,
				minuteOrSecond: payload.minuteOrSecond,
				eventType: payload.eventType,
				eventValue: payload.eventValue ?? eventType.defaultValue,
				metadata: {},
			})
			.returning();

		// Recalcular marcador desde eventos puntuables (fuente de verdad para deportes con catálogo de score)
		if (eventType.affectsScore) {
			await recalculateScoreFromEvents(tx, matchId);
		}

		return event;
	});

	await recalculateStandingsIfFinished(matchId);
	const [matchRow] = await db
		.select({ stageId: matches.stageId })
		.from(matches)
		.where(eq(matches.id, matchId))
		.limit(1);
	if (matchRow) await syncAdvancement(matchRow.stageId).catch(() => undefined);
	publishMatch(matchId, { type: "event", matchId, payload: event });
	return event;
}

// ==========================================
// Programación y sede
// ==========================================

export async function assignVenue(matchId: string, venueId: string) {
	await findVenueById(venueId);
	await assertMatchExists(matchId);

	const [updated] = await db
		.update(matches)
		.set({ venueId })
		.where(eq(matches.id, matchId))
		.returning();

	return updated;
}

export async function scheduleMatch(matchId: string, scheduledAt: string) {
	await assertMatchExists(matchId);

	const [updated] = await db
		.update(matches)
		.set({ scheduledAt: new Date(scheduledAt) })
		.where(eq(matches.id, matchId))
		.returning();

	return updated;
}

// ==========================================
// Helpers internos
// ==========================================

// Convierte fechas ISO (TypeBox) a Date (Drizzle) para insert/update
function toMatchRow<T extends { scheduledAt?: string | Date | null }>(
	data: T,
): Omit<T, "scheduledAt"> & { scheduledAt?: Date } {
	const { scheduledAt, ...rest } = data;
	return {
		...(rest as Omit<T, "scheduledAt">),
		...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
	};
}

async function getMatchOrThrow(tx: Tx, id: string) {
	const [match] = await tx
		.select()
		.from(matches)
		.where(eq(matches.id, id))
		.limit(1);

	if (!match) throw DomainError.notFound(`Match '${id}' not found`);
	return match;
}

async function assertMatchExists(id: string) {
	const [match] = await db
		.select({ id: matches.id })
		.from(matches)
		.where(eq(matches.id, id))
		.limit(1);

	if (!match) throw DomainError.notFound(`Match '${id}' not found`);
}

async function assertParticipantTeams(homeTeamId: string, awayTeamId: string) {
	await findTeamById(homeTeamId);
	await findTeamById(awayTeamId);
}

async function assertTeamsRegisteredInStage(
	stageId: string,
	homeTeamId: string,
	awayTeamId: string,
) {
	const rows = await db
		.select({ teamId: stageTeamRegistrations.teamId })
		.from(stageTeamRegistrations)
		.where(eq(stageTeamRegistrations.stageId, stageId));

	const registered = new Set(rows.map((r) => r.teamId));
	for (const teamId of [homeTeamId, awayTeamId]) {
		if (!registered.has(teamId)) {
			throw DomainError.badRequest(
				`Team '${teamId}' is not registered in stage '${stageId}'`,
			);
		}
	}
}

// Tras finalizar un partido con grupo, sincroniza la tabla de posiciones
async function recalculateStandingsIfFinished(matchId: string): Promise<void> {
	const [row] = await db
		.select({ groupId: matches.groupId, status: matches.status })
		.from(matches)
		.where(eq(matches.id, matchId))
		.limit(1);

	if (
		row?.groupId &&
		(row.status === "finished" || row.status === "walkover")
	) {
		await recalculateGroupStandings(row.groupId);
	}
}

function assertWinnerIsParticipant(
	match: { homeTeamId?: string | null; awayTeamId?: string | null },
	winnerTeamId: string,
) {
	if (winnerTeamId !== match.homeTeamId && winnerTeamId !== match.awayTeamId) {
		throw DomainError.badRequest(
			"winnerTeamId must be one of the match participants",
		);
	}
}

function resolveWinner(
	payload: UpdateMatchScore,
	match: { homeTeamId: string | null; awayTeamId: string | null },
): string | null | undefined {
	// Walkover: el ganador viene validado explícito en el payload
	if (payload.status === "walkover") {
		return payload.winnerTeamId;
	}

	if (payload.status === "finished") {
		return payload.winnerTeamId ?? resolveByScores(payload, match);
	}

	// Otros estados: conservar ganador solo si se indica explícitamente
	return payload.winnerTeamId;
}

function resolveByScores(
	payload: UpdateMatchScore,
	match: { homeTeamId: string | null; awayTeamId: string | null },
): string | null {
	if (payload.homeScore > payload.awayScore) return match.homeTeamId;
	if (payload.awayScore > payload.homeScore) return match.awayTeamId;
	return null;
}

async function getMatchSportId(tx: Tx, matchId: string): Promise<string> {
	const [row] = await tx
		.select({ sportId: tournaments.sportId })
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
	return row.sportId;
}

async function recalculateScoreFromEvents(tx: Tx, matchId: string) {
	const match = await getMatchOrThrow(tx, matchId);
	const sportId = await getMatchSportId(tx, matchId);

	const totals = await tx
		.select({
			teamId: matchEvents.teamId,
			total: sql<number>`sum(${matchEvents.eventValue})::int`,
		})
		.from(matchEvents)
		.innerJoin(
			sportEventTypes,
			and(
				eq(sportEventTypes.sportId, sportId),
				eq(sportEventTypes.code, matchEvents.eventType),
			),
		)
		.where(
			and(
				eq(matchEvents.matchId, matchId),
				eq(sportEventTypes.affectsScore, true),
			),
		)
		.groupBy(matchEvents.teamId);

	const homeTotal = totals.find((t) => t.teamId === match.homeTeamId)?.total;
	const awayTotal = totals.find((t) => t.teamId === match.awayTeamId)?.total;

	// Si el partido ya terminó, el ganador se deriva del marcador recalculado
	const winnerTeamId =
		match.status === "finished"
			? (homeTotal ?? 0) > (awayTotal ?? 0)
				? match.homeTeamId
				: (awayTotal ?? 0) > (homeTotal ?? 0)
					? match.awayTeamId
					: null
			: undefined;

	await tx
		.update(matches)
		.set({
			homeScore: homeTotal ?? 0,
			awayScore: awayTotal ?? 0,
			...(winnerTeamId === undefined ? {} : { winnerTeamId }),
		})
		.where(eq(matches.id, matchId));
}

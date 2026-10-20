import { db } from "@sports/db";
import {
	matches,
	stageGroups,
	stageTeamRegistrations,
	teams,
	venues,
} from "@sports/db/tables";
import type { GenerateFixture } from "@sports/schemas";
import { asc, eq, getTableColumns, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DomainError } from "./errors";
import { findStageById } from "./stage.service";
import { findVenueById } from "./venue.service";

const DEFAULT_TIME_ZONE = "UTC";
const DEFAULT_KICKOFF = "09:00";
const DEFAULT_INTERVAL_DAYS = 7;
const DEFAULT_MATCH_DURATION = 60;

type RoundRobinPair = { homeTeamId: string; awayTeamId: string };

type FixtureUnit = {
	groupId: string | null;
	name: string;
	teamIds: string[];
};

type ScheduleOptions = {
	startDate: string;
	timeZone: string;
	intervalDays: number;
	matchDurationMinutes: number;
	times: string[];
	/** Vacío cuando la etapa no tiene sede: los partidos quedan sin cancha. */
	fields: number[];
};

/**
 * Fixture de una etapa completo, sin paginar: la pantalla lo necesita entero y
 * el tamaño está acotado por los equipos de la etapa. Incluye la identidad de
 * los equipos y la sede para que la tabla no dispare una consulta por fila.
 */
export async function listStageFixture(stageId: string) {
	await findStageById(stageId);

	const homeTeams = alias(teams, "fixture_home_team");
	const awayTeams = alias(teams, "fixture_away_team");

	const items = await db
		.select({
			...getTableColumns(matches),
			homeTeam: { id: homeTeams.id, name: homeTeams.name },
			awayTeam: { id: awayTeams.id, name: awayTeams.name },
			venue: { id: venues.id, name: venues.name },
		})
		.from(matches)
		.leftJoin(homeTeams, eq(matches.homeTeamId, homeTeams.id))
		.leftJoin(awayTeams, eq(matches.awayTeamId, awayTeams.id))
		.leftJoin(venues, eq(matches.venueId, venues.id))
		.where(eq(matches.stageId, stageId))
		.orderBy(
			asc(matches.roundNumber),
			sql`${matches.scheduledAt} asc nulls last`,
			sql`${matches.matchNumber} asc nulls last`,
			asc(matches.id),
		);

	return {
		items: items.map((item) => ({
			...item,
			// jsonb llega como `unknown`; la respuesta declara el objeto JSON.
			metadata: (item.metadata ?? {}) as Record<string, unknown>,
		})),
		total: items.length,
	};
}

/**
 * Genera el fixture de una liguilla (round robin) a partir de los equipos
 * inscriptos. Con grupos, arma una liguilla por grupo y alinea las jornadas;
 * sin grupos, una sola liguilla con todos.
 *
 * Reglas:
 * - Solo etapa `round_robin`. La eliminación directa tiene su generador de
 *   llaves (`POST /stages/:stageId/bracket`).
 * - No toca partidos existentes sin `force`; con `force` solo regenera si
 *   ninguno empezó y no hay una llave enlazada.
 * - La jornada es `roundNumber`; la fecha vive en cada `scheduledAt`, no en
 *   una tabla aparte que pueda desincronizarse.
 */
export async function generateRoundRobinFixture(
	stageId: string,
	body: GenerateFixture,
	force = false,
) {
	const stage = await findStageById(stageId);
	if (stage.stageType !== "round_robin") {
		throw DomainError.badRequest(
			"Solo una etapa de liguilla puede generar su fixture automáticamente. Para eliminación directa usa la generación de llaves",
		);
	}

	const venue = body.venueId ? await findVenueById(body.venueId) : null;
	const options = resolveScheduleOptions(body, venue);

	const [existing, groups, registrations] = await Promise.all([
		db
			.select({
				id: matches.id,
				status: matches.status,
				nextMatchId: matches.nextMatchId,
				loserNextMatchId: matches.loserNextMatchId,
			})
			.from(matches)
			.where(eq(matches.stageId, stageId)),
		db
			.select()
			.from(stageGroups)
			.where(eq(stageGroups.stageId, stageId))
			.orderBy(asc(stageGroups.name)),
		db
			.select({
				teamId: stageTeamRegistrations.teamId,
				groupId: stageTeamRegistrations.groupId,
				teamName: teams.name,
			})
			.from(stageTeamRegistrations)
			.innerJoin(teams, eq(stageTeamRegistrations.teamId, teams.id))
			.where(eq(stageTeamRegistrations.stageId, stageId))
			.orderBy(
				sql`${stageTeamRegistrations.position} asc nulls last`,
				asc(stageTeamRegistrations.seedNumber),
				asc(teams.name),
			),
	]);

	assertCanRegenerate(existing, force);
	assertEnoughTeams(registrations, groups);

	const units = buildUnits(registrations, groups);
	const unitsWithRounds = units.map((unit) => ({
		...unit,
		rounds: buildRoundRobin(unit.teamIds, body.doubleRound ?? false),
	}));
	const totalMatchdays = Math.max(
		0,
		...unitsWithRounds.map((unit) => unit.rounds.length),
	);
	if (totalMatchdays === 0) {
		throw DomainError.badRequest(
			"No hay equipos suficientes para armar el fixture",
		);
	}

	const warnings = new Set<string>();
	const rows: Array<typeof matches.$inferInsert> = [];
	let matchNumber = 1;

	for (let matchday = 0; matchday < totalMatchdays; matchday++) {
		const date = addDays(options.startDate, matchday * options.intervalDays);
		const dayPairs = unitsWithRounds.flatMap((unit) =>
			(unit.rounds[matchday] ?? []).map((pair) => ({
				...pair,
				groupId: unit.groupId,
			})),
		);

		const fields = options.fields.length > 0 ? options.fields : [null];
		const slotsPerWave = options.times.length * fields.length;

		dayPairs.forEach((pair, index) => {
			const wave = Math.floor(index / slotsPerWave);
			const slot = index % slotsPerWave;
			const baseTime =
				options.times[slot % options.times.length] ?? DEFAULT_KICKOFF;
			const field = fields[Math.floor(slot / options.times.length)] ?? null;
			const { time, dayOffset } = addMinutes(
				baseTime,
				wave * options.matchDurationMinutes,
			);

			if (wave > 0) {
				warnings.add(
					`La jornada ${matchday + 1} no entra en las franjas elegidas; se extendió con turnos cada ${options.matchDurationMinutes} minutos`,
				);
			}
			if (dayOffset > 0) {
				warnings.add(
					`La jornada ${matchday + 1} termina después de medianoche; revisa las horas de inicio`,
				);
			}

			rows.push({
				stageId,
				groupId: pair.groupId,
				roundNumber: matchday + 1,
				matchNumber: matchNumber++,
				homeTeamId: pair.homeTeamId,
				awayTeamId: pair.awayTeamId,
				venueId: venue?.id ?? null,
				fieldNumber: field,
				scheduledAt: zonedDateTimeToUtc(
					addDays(date, dayOffset),
					time,
					options.timeZone,
				),
				status: "scheduled",
				homeScore: 0,
				awayScore: 0,
				metadata: {},
			});
		});
	}

	await db.transaction(async (tx) => {
		if (force && existing.length > 0) {
			await tx.delete(matches).where(eq(matches.stageId, stageId));
		}
		if (rows.length > 0) {
			await tx.insert(matches).values(rows);
		}
	});

	return {
		matches: rows.length,
		matchdays: totalMatchdays,
		warnings: [...warnings],
	};
}

function assertCanRegenerate(
	existing: Array<{
		id: string;
		status: string;
		nextMatchId: string | null;
		loserNextMatchId: string | null;
	}>,
	force: boolean,
) {
	if (existing.length === 0) return;
	if (!force) {
		throw DomainError.conflict(
			`La etapa ya tiene ${existing.length} partidos. Confirma que quieres regenerar el fixture`,
		);
	}
	if (existing.some((m) => m.nextMatchId || m.loserNextMatchId)) {
		throw DomainError.conflict(
			"La etapa tiene una llave enlazada; no se puede regenerar como liguilla",
		);
	}
	if (
		existing.some((m) => m.status !== "scheduled" && m.status !== "cancelled")
	) {
		throw DomainError.conflict(
			"La etapa ya empezó: hay partidos en juego o finalizados y no se puede regenerar el fixture",
		);
	}
}

function assertEnoughTeams(
	registrations: Array<{
		teamId: string;
		groupId: string | null;
		teamName: string;
	}>,
	groups: Array<{ id: string; name: string }>,
) {
	if (registrations.length < 2) {
		throw DomainError.badRequest(
			"La etapa necesita al menos 2 equipos inscritos para generar el fixture",
		);
	}

	if (groups.length === 0) return;

	const groupIds = new Set(groups.map((group) => group.id));
	const unknownGroup = registrations.find(
		(row) => row.groupId && !groupIds.has(row.groupId),
	);
	if (unknownGroup) {
		throw DomainError.badRequest(
			`El equipo "${unknownGroup.teamName}" tiene un grupo que no pertenece a esta etapa`,
		);
	}

	const unassigned = registrations.filter((row) => !row.groupId);
	if (unassigned.length > 0) {
		const names = unassigned
			.slice(0, 8)
			.map((row) => row.teamName)
			.join(", ");
		const suffix =
			unassigned.length > 8 ? ` y ${unassigned.length - 8} más` : "";
		throw DomainError.badRequest(
			`Antes de generar el fixture, asigna un grupo a: ${names}${suffix}`,
		);
	}

	for (const group of groups) {
		const count = registrations.filter(
			(row) => row.groupId === group.id,
		).length;
		if (count < 2) {
			throw DomainError.badRequest(
				`El grupo "${group.name}" necesita al menos 2 equipos para armar su liguilla`,
			);
		}
	}
}

function buildUnits(
	registrations: Array<{
		teamId: string;
		groupId: string | null;
		teamName: string;
	}>,
	groups: Array<{ id: string; name: string }>,
): FixtureUnit[] {
	if (groups.length === 0) {
		return [
			{
				groupId: null,
				name: "la etapa",
				teamIds: registrations.map((row) => row.teamId),
			},
		];
	}

	return groups.map((group) => ({
		groupId: group.id,
		name: group.name,
		teamIds: registrations
			.filter((row) => row.groupId === group.id)
			.map((row) => row.teamId),
	}));
}

/**
 * Método del círculo: una vuelta completa son `n - 1` jornadas (o `n` si el
 * número de equipos es impar, porque uno descansa). Con `doubleRound` se
 * agrega la vuelta con la localía invertida.
 */
export function buildRoundRobin(
	teamIds: string[],
	doubleRound: boolean,
): RoundRobinPair[][] {
	if (teamIds.length < 2) return [];

	const slots: Array<string | null> = [...teamIds];
	if (slots.length % 2 === 1) slots.push(null);
	const size = slots.length;
	const rounds: RoundRobinPair[][] = [];
	let rotation = [...slots];

	for (let round = 0; round < size - 1; round++) {
		const pairs: RoundRobinPair[] = [];
		for (let index = 0; index < size / 2; index++) {
			const first = rotation[index];
			const second = rotation[size - 1 - index];
			if (!first || !second) continue;
			// Alternar la localía por ronda y por cruce mantiene la serie
			// razonablemente balanceada sin necesitar otra pasada.
			const swap = (round + index) % 2 === 1;
			pairs.push(
				swap
					? { homeTeamId: second, awayTeamId: first }
					: { homeTeamId: first, awayTeamId: second },
			);
		}
		rounds.push(pairs);

		const fixed = rotation[0];
		const rest = rotation.slice(1);
		rotation = [fixed, rest[rest.length - 1] ?? null, ...rest.slice(0, -1)];
	}

	if (doubleRound) {
		rounds.push(
			...rounds.map((pairs) =>
				pairs.map(({ homeTeamId, awayTeamId }) => ({
					homeTeamId: awayTeamId,
					awayTeamId: homeTeamId,
				})),
			),
		);
	}

	return rounds;
}

function resolveScheduleOptions(
	body: GenerateFixture,
	venue: { id: string; name: string; fieldCount: number } | null,
): ScheduleOptions {
	assertValidDate(body.startDate);
	const timeZone = body.timeZone?.trim() || DEFAULT_TIME_ZONE;
	assertValidTimeZone(timeZone);

	const times = [...(body.kickoffTimes ?? [DEFAULT_KICKOFF])].sort();
	if (new Set(times).size !== times.length) {
		throw DomainError.badRequest("Las horas de inicio no pueden repetirse");
	}

	let fields: number[] = [];
	if (venue) {
		fields = body.fieldNumbers
			? [...body.fieldNumbers]
			: Array.from({ length: venue.fieldCount }, (_, index) => index + 1);
		if (fields.length === 0) {
			throw DomainError.badRequest(
				`La sede "${venue.name}" no tiene canchas configuradas`,
			);
		}
		if (new Set(fields).size !== fields.length) {
			throw DomainError.badRequest("Las canchas no pueden repetirse");
		}
		fields.sort((a, b) => a - b);
		for (const field of fields) {
			if (!Number.isInteger(field) || field < 1 || field > venue.fieldCount) {
				throw DomainError.badRequest(
					`La cancha ${field} no existe en "${venue.name}" (tiene ${venue.fieldCount} canchas)`,
				);
			}
		}
	} else if (body.fieldNumbers && body.fieldNumbers.length > 0) {
		throw DomainError.badRequest(
			"Para asignar canchas, primero elige una sede para el fixture",
		);
	}

	return {
		startDate: body.startDate,
		timeZone,
		intervalDays: body.intervalDays ?? DEFAULT_INTERVAL_DAYS,
		matchDurationMinutes: body.matchDurationMinutes ?? DEFAULT_MATCH_DURATION,
		times,
		fields,
	};
}

function assertValidDate(value: string) {
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		throw DomainError.badRequest(`La fecha "${value}" no es válida`);
	}
}

function assertValidTimeZone(timeZone: string) {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone });
	} catch {
		throw DomainError.badRequest(`La zona horaria "${timeZone}" no es válida`);
	}
}

function addDays(value: string, days: number): string {
	const [year, month, day] = value.split("-").map(Number);
	const date = new Date(Date.UTC(year, month - 1, day + days));
	return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
		date.getUTCDate(),
	)}`;
}

function addMinutes(time: string, minutes: number) {
	const [hours, mins] = time.split(":").map(Number);
	const total = hours * 60 + mins + minutes;
	const dayOffset = Math.floor(total / 1440);
	const withinDay = ((total % 1440) + 1440) % 1440;
	return {
		time: `${pad(Math.floor(withinDay / 60))}:${pad(withinDay % 60)}`,
		dayOffset,
	};
}

/**
 * Combina una fecha y hora locales con una zona IANA y devuelve el instante
 * UTC. No hay librería de fechas en el proyecto: `Intl` da el offset de la
 * zona para ese día, incluido el horario de verano.
 */
function zonedDateTimeToUtc(
	date: string,
	time: string,
	timeZone: string,
): Date {
	const [year, month, day] = date.split("-").map(Number);
	const [hours, minutes] = time.split(":").map(Number);
	const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes));

	const firstOffset = timeZoneOffsetMs(guess, timeZone);
	let result = new Date(guess.getTime() - firstOffset);
	const secondOffset = timeZoneOffsetMs(result, timeZone);
	if (secondOffset !== firstOffset) {
		result = new Date(guess.getTime() - secondOffset);
	}
	return result;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).formatToParts(date);

	const values: Record<string, number> = {};
	for (const part of parts) {
		if (part.type !== "literal") values[part.type] = Number(part.value);
	}
	const hour = values.hour === 24 ? 0 : values.hour;
	const asUtc = Date.UTC(
		values.year,
		values.month - 1,
		values.day,
		hour,
		values.minute,
		values.second,
	);
	return asUtc - date.getTime();
}

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

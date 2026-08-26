import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@sports/db";
import {
	matches,
	sports,
	stageGroups,
	stageStandings,
	stageTeamRegistrations,
	teams,
	tournamentEditions,
	tournamentStages,
	tournaments,
} from "@sports/db/tables";
import type { UpdateStandingRow } from "@sports/schemas";
import { DomainError } from "./errors";
import { findGroupById } from "./stage.service";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DEFAULT_POINTS = { win: 3, draw: 1, loss: 0 };

// ==========================================
// Consultas
// ==========================================

export async function getStandings(groupId: string) {
	await findGroupById(groupId);

	const where = eq(stageStandings.groupId, groupId);
	const orderBy = [
		asc(stageStandings.rankPosition),
		desc(stageStandings.points),
		desc(stageStandings.scoreDifference),
		desc(stageStandings.scoreFor),
	] as const;

	const [items, totalRows] = await Promise.all([
		db
			.select({ standing: stageStandings, team: teams })
			.from(stageStandings)
			.innerJoin(teams, eq(stageStandings.teamId, teams.id))
			.where(where)
			.orderBy(...orderBy),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(stageStandings)
			.where(where),
	]);

	return { items, total: totalRows[0]?.count ?? 0 };
}

// ==========================================
// Recálculo desde partidos finalizados
// ==========================================

export async function recalculateGroupStandings(groupId: string) {
	return db.transaction(async (tx) => {
		await findGroupById(groupId);
		const rules = await getScoringRules(tx, groupId);

		// Partidos finalizados del grupo
		const groupMatches = await tx
			.select()
			.from(matches)
			.where(and(eq(matches.groupId, groupId), eq(matches.status, "finished")));

		// Acumular estadísticas por equipo registrado en el grupo
		const stats = new Map<
			string,
			{
				played: number;
				won: number;
				drawn: number;
				lost: number;
				points: number;
				scoreFor: number;
				scoreAgainst: number;
			}
		>();

		const ensureRow = (teamId: string) => {
			let row = stats.get(teamId);
			if (!row) {
				row = {
					played: 0,
					won: 0,
					drawn: 0,
					lost: 0,
					points: 0,
					scoreFor: 0,
					scoreAgainst: 0,
				};
				stats.set(teamId, row);
			}
			return row;
		};

		// Sembrar filas para todos los equipos registrados (aunque no tengan partidos)
		const registrations = await tx
			.select({ teamId: stageTeamRegistrations.teamId })
			.from(stageTeamRegistrations)
			.where(eq(stageTeamRegistrations.groupId, groupId));
		registrations.forEach((r) => ensureRow(r.teamId));

		for (const m of groupMatches) {
			if (!m.homeTeamId || !m.awayTeamId) continue;

			const home = ensureRow(m.homeTeamId);
			const away = ensureRow(m.awayTeamId);

			home.played++;
			away.played++;
			home.scoreFor += m.homeScore;
			home.scoreAgainst += m.awayScore;
			away.scoreFor += m.awayScore;
			away.scoreAgainst += m.homeScore;

			if (m.winnerTeamId) {
				const isHomeWin = m.winnerTeamId === m.homeTeamId;
				const winner = isHomeWin ? home : away;
				const loser = isHomeWin ? away : home;
				winner.won++;
				loser.lost++;
				winner.points += rules.win;
				loser.points += rules.loss;
			} else if (rules.hasDraws) {
				home.drawn++;
				away.drawn++;
				home.points += rules.draw;
				away.points += rules.draw;
			}
			// Sin empates permitidos y sin winner definido: no otorga puntos
		}

		// Upsert de las filas de posiciones
		for (const [teamId, s] of stats.entries()) {
			await tx
				.insert(stageStandings)
				.values({
					groupId,
					teamId,
					played: s.played,
					won: s.won,
					drawn: s.drawn,
					lost: s.lost,
					points: s.points,
					scoreFor: s.scoreFor,
					scoreAgainst: s.scoreAgainst,
					rankPosition: 0,
					updatedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [stageStandings.groupId, stageStandings.teamId],
					set: {
						played: s.played,
						won: s.won,
						drawn: s.drawn,
						lost: s.lost,
						points: s.points,
						scoreFor: s.scoreFor,
						scoreAgainst: s.scoreAgainst,
						updatedAt: new Date(),
					},
				});
		}

		// Asignar posición de ranking según criterios de desempate
		const ranked = await tx
			.select({ id: stageStandings.id })
			.from(stageStandings)
			.where(eq(stageStandings.groupId, groupId))
			.orderBy(
				desc(stageStandings.points),
				desc(stageStandings.scoreDifference),
				desc(stageStandings.scoreFor),
			);

		for (const [index, row] of ranked.entries()) {
			await tx
				.update(stageStandings)
				.set({ rankPosition: index + 1 })
				.where(eq(stageStandings.id, row.id));
		}

		return db
			.select()
			.from(stageStandings)
			.where(eq(stageStandings.groupId, groupId))
			.orderBy(
				desc(stageStandings.points),
				desc(stageStandings.scoreDifference),
				desc(stageStandings.scoreFor),
			);
	});
}

// ==========================================
// Ajuste manual (admin)
// ==========================================

export async function findStandingRowById(id: string) {
	const [row] = await db
		.select()
		.from(stageStandings)
		.where(eq(stageStandings.id, id))
		.limit(1);

	if (!row) throw DomainError.notFound(`Standing row '${id}' not found`);
	return row;
}

export async function updateStandingRow(id: string, data: UpdateStandingRow) {
	await findStandingRowById(id);

	// scoreDifference es columna generada en DB: no se escribe directamente
	const [updated] = await db
		.update(stageStandings)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(stageStandings.id, id))
		.returning();

	return updated;
}

// ==========================================
// Helpers internos
// ==========================================

async function getScoringRules(tx: Tx, groupId: string) {
	// grupo → etapa → edición → torneo → deporte
	const [row] = await tx
		.select({
			hasDraws: sports.hasDraws,
			scoringRules: sports.scoringRules,
		})
		.from(stageGroups)
		.innerJoin(tournamentStages, eq(stageGroups.stageId, tournamentStages.id))
		.innerJoin(
			tournamentEditions,
			eq(tournamentStages.editionId, tournamentEditions.id),
		)
		.innerJoin(tournaments, eq(tournamentEditions.tournamentId, tournaments.id))
		.innerJoin(sports, eq(tournaments.sportId, sports.id))
		.where(eq(stageGroups.id, groupId))
		.limit(1);

	if (!row) throw DomainError.notFound(`Group '${groupId}' not found`);

	const rules = row.scoringRules ?? {};
	return {
		hasDraws: row.hasDraws,
		win: rules.win ?? DEFAULT_POINTS.win,
		draw: rules.draw ?? DEFAULT_POINTS.draw,
		loss: rules.loss ?? DEFAULT_POINTS.loss,
	};
}

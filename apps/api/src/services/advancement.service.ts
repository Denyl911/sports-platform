import { db } from "@sports/db";
import type { AdvancementRules } from "@sports/db/tables";
import {
	matches,
	stageGroups,
	stageStandings,
	stageTeamRegistrations,
	teams,
} from "@sports/db/tables";
import type { AdvancementRulesInput, StageQualifiers } from "@sports/schemas";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { findNextStage, findStageById } from "./stage.service";

// ==========================================
// Avance entre etapas
// ==========================================
//
// La etapa no "recuerda" a quién movió: la previa es una función de lo que
// la tabla dice hoy más la regla que la etapa declara. Esto es la mitad de
// lectura; materializar los clasificados en la etapa siguiente vive acá
// mismo cuando entre (misma fuente, un solo normalizador de regla).

/**
 * Previa de clasificados: la posición de cada equipo inscrito **con grupo**
 * en la etapa, ordenada como la tabla (puntos, diferencia, a favor, id) y con
 * la regla de avance aplicada.
 *
 * Se arma desde `stage_standings` con `leftJoin`: un grupo que todavía no
 * jugó no tiene filas de tabla y sus equipos igual tienen que figurar — son
 * los que están compitiendo por el puesto. El orden no confía en
 * `rankPosition` (lo asigna el recálculo y puede faltar) y termina en el id
 * del equipo: dos equipos idénticos en los tres criterios tienen que salir
 * siempre en el mismo orden, o el avance no es reproducible.
 *
 * Round trips: la etapa (404 y regla) y las filas ordenadas — 2, la fila de
 * `query-budgets.test.ts` lo fija (ADR 008).
 */
export async function listStageQualifiers(
	stageId: string,
): Promise<StageQualifiers> {
	const stage = await findStageById(stageId);
	// `advancementRules` es jsonb: la forma la pone el contrato. El cast es la
	// única frontera donde el dominio lee la regla (el round-trip test paga
	// que la forma que se escribe vuelva con la misma forma).
	const rule = normalizeAdvancementRules(
		stage.advancementRules as AdvancementRules,
	);

	const rows = await db
		.select({
			groupId: stageGroups.id,
			groupName: stageGroups.name,
			teamId: teams.id,
			teamName: teams.name,
			points: stageStandings.points,
			scoreDifference: stageStandings.scoreDifference,
			scoreFor: stageStandings.scoreFor,
		})
		.from(stageTeamRegistrations)
		.innerJoin(stageGroups, eq(stageTeamRegistrations.groupId, stageGroups.id))
		.innerJoin(teams, eq(stageTeamRegistrations.teamId, teams.id))
		.leftJoin(
			stageStandings,
			and(
				eq(stageStandings.groupId, stageTeamRegistrations.groupId),
				eq(stageStandings.teamId, stageTeamRegistrations.teamId),
			),
		)
		.where(eq(stageTeamRegistrations.stageId, stageId))
		.orderBy(
			asc(stageGroups.name),
			desc(sql`coalesce(${stageStandings.points}, 0)`),
			desc(sql`coalesce(${stageStandings.scoreDifference}, 0)`),
			desc(sql`coalesce(${stageStandings.scoreFor}, 0)`),
			asc(teams.id),
		);

	// La posición es un contador por grupo en el orden que ya trae la query.
	const positions = new Map<string, number>();
	const items: StageQualifiers["items"] = [];
	for (const row of rows) {
		const position = (positions.get(row.groupId) ?? 0) + 1;
		positions.set(row.groupId, position);
		items.push({
			groupId: row.groupId,
			groupName: row.groupName,
			position,
			qualified:
				rule?.qualifyPerGroup != null && position <= rule.qualifyPerGroup,
			team: { id: row.teamId, name: row.teamName },
		});
	}

	return { rule, items };
}

/**
 * La regla con forma, o `null` cuando la etapa no alimenta a nadie: `{}` (el
 * default de la columna) y "sin clasificados" son lo mismo.
 */
export function normalizeAdvancementRules(
	raw: AdvancementRules,
): AdvancementRulesInput | null {
	const qualifyPerGroup = raw?.qualifyPerGroup;
	if (typeof qualifyPerGroup !== "number" || qualifyPerGroup < 1) return null;
	return {
		qualifyPerGroup,
		...(raw.seeding ? { seeding: raw.seeding } : {}),
	};
}

// ==========================================
// Materialización de los clasificados en la etapa siguiente
// ==========================================

export interface SyncAdvancementResult {
	synced: boolean;
	reason: string | null;
	registered: number;
}

/**
 * Mueve los clasificados de `sourceStageId` a la etapa siguiente (la de
 * menor `sequenceOrder` mayor en la misma edición), **solo si la etapa
 * siguiente no ha empezado**: una etapa con partidos en curso o terminados
 * ya tiene resultados y reescribir sus equipos rompería la integridad.
 *
 * La inscripción del destino pasa a ser *derivada*: se insertan los
 * faltantes, se ajusta el `seedNumber` y se quitan los que ya no clasifican.
 * Idempotente: correrla dos veces deja el mismo conjunto.
 *
 * Round trips: etapa origen (regla), etapa siguiente, partidos del destino
 * (seguridad) y las filas de clasificados — 4, medidos cuando se fije la fila.
 */
export async function syncAdvancement(
	sourceStageId: string,
): Promise<SyncAdvancementResult> {
	const source = await findStageById(sourceStageId);
	const rule = normalizeAdvancementRules(
		source.advancementRules as AdvancementRules,
	);
	if (!rule) return { synced: false, reason: "no_rule", registered: 0 };

	const next = await findNextStage(source.editionId, source.sequenceOrder);
	if (!next) return { synced: false, reason: "no_next_stage", registered: 0 };

	// Seguridad: si la etapa siguiente ya tiene partidos no programados, no
	// se toca — los equipos ya están compitiendo.
	const started = await db
		.select({ id: matches.id })
		.from(matches)
		.where(
			and(
				eq(matches.stageId, next.id),
				inArray(matches.status, [
					"in_progress",
					"paused",
					"finished",
					"walkover",
					"cancelled",
				]),
			),
		)
		.limit(1);
	if (started.length > 0) {
		return { synced: false, reason: "target_started", registered: 0 };
	}

	const { items } = await listStageQualifiers(sourceStageId);
	const qualified = items.filter((q) => q.qualified);

	await db.transaction(async (tx) => {
		const current = await tx
			.select({
				id: stageTeamRegistrations.id,
				teamId: stageTeamRegistrations.teamId,
			})
			.from(stageTeamRegistrations)
			.where(eq(stageTeamRegistrations.stageId, next.id));

		const currentByTeam = new Map(current.map((r) => [r.teamId, r.id]));
		const qualifiedIds = new Set(qualified.map((q) => q.team.id));

		// Insertar / actualizar los que clasifican, con seedNumber por orden.
		let seed = 1;
		for (const q of qualified) {
			const existingId = currentByTeam.get(q.team.id);
			if (existingId) {
				await tx
					.update(stageTeamRegistrations)
					.set({ seedNumber: seed })
					.where(eq(stageTeamRegistrations.id, existingId));
			} else {
				await tx.insert(stageTeamRegistrations).values({
					stageId: next.id,
					teamId: q.team.id,
					seedNumber: seed,
				});
			}
			seed++;
		}

		// Quitar los que ya no clasifican.
		for (const r of current) {
			if (!qualifiedIds.has(r.teamId)) {
				await tx
					.delete(stageTeamRegistrations)
					.where(eq(stageTeamRegistrations.id, r.id));
			}
		}
	});

	return { synced: true, reason: null, registered: qualified.length };
}

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
import { DomainError } from "./errors";
import {
	findNextStage,
	findPreviousStage,
	findStageById,
} from "./stage.service";

// ==========================================
// Avance entre etapas
// ==========================================

/**
 * Previa de clasificados: la posición de cada equipo inscrito **con grupo**
 * en la etapa, ordenada como la tabla (puntos, diferencia, a favor, id) y con
 * la regla de avance aplicada.
 */
export async function listStageQualifiers(
	stageId: string,
): Promise<StageQualifiers> {
	const stage = await findStageById(stageId);
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

// ==========================================
// Generación de la llave de eliminación directa
// ==========================================

export interface GenerateBracketResult {
	created: number;
	rounds: number;
	byes: number;
}

export async function advanceBracketWinner(matchId: string): Promise<void> {
	const [match] = await db
		.select()
		.from(matches)
		.where(eq(matches.id, matchId))
		.limit(1);
	if (!match || !match.nextMatchId || !match.nextMatchSlot) return;
	if (match.status !== "finished" && match.status !== "walkover") return;
	if (!match.winnerTeamId) return;

	const [next] = await db
		.select()
		.from(matches)
		.where(eq(matches.id, match.nextMatchId))
		.limit(1);
	if (!next) return;
	if (next.status !== "scheduled") {
		throw DomainError.conflict(
			"El partido siguiente ya empezó; no se puede propagar el ganador automáticamente",
		);
	}
	await db
		.update(matches)
		.set(
			match.nextMatchSlot === "home"
				? { homeTeamId: match.winnerTeamId }
				: { awayTeamId: match.winnerTeamId },
		)
		.where(eq(matches.id, next.id));
}

function nextPow2(n: number): number {
	let s = 1;
	while (s < n) s *= 2;
	return s;
}

export async function generateBracket(
	stageId: string,
	force: boolean,
): Promise<GenerateBracketResult> {
	const stage = await findStageById(stageId);
	if (stage.stageType !== "single_elimination") {
		throw DomainError.badRequest(
			"La llave solo se genera para etapas de eliminación directa",
		);
	}

	let entrants: { teamId: string; seed: number }[] = [];
	const source = await findPreviousStage(stage.editionId, stage.sequenceOrder);
	if (source) {
		const rule = normalizeAdvancementRules(
			source.advancementRules as AdvancementRules,
		);
		if (rule) {
			const { items } = await listStageQualifiers(source.id);
			entrants = items
				.filter((q) => q.qualified)
				.map((q, i) => ({ teamId: q.team.id, seed: i + 1 }));
		}
	}
	if (entrants.length === 0) {
		const regs = await db
			.select({
				teamId: stageTeamRegistrations.teamId,
				seedNumber: stageTeamRegistrations.seedNumber,
			})
			.from(stageTeamRegistrations)
			.where(eq(stageTeamRegistrations.stageId, stageId))
			.orderBy(
				asc(stageTeamRegistrations.seedNumber),
				asc(stageTeamRegistrations.teamId),
			);
		entrants = regs.map((r, i) => ({
			teamId: r.teamId,
			seed: r.seedNumber ?? i + 1,
		}));
	}
	if (entrants.length < 2) {
		throw DomainError.badRequest(
			"Se necesitan al menos 2 clasificados para generar la llave",
		);
	}

	const existing = await db
		.select({ id: matches.id, status: matches.status })
		.from(matches)
		.where(eq(matches.stageId, stageId));
	if (existing.length > 0) {
		if (existing.some((m) => m.status !== "scheduled")) {
			throw DomainError.conflict("La llave ya empezó; no se puede regenerar");
		}
		if (!force) {
			throw DomainError.conflict(
				"La etapa ya tiene partidos; usa force para regenerar",
			);
		}
		await db.delete(matches).where(eq(matches.stageId, stageId));
	}

	entrants.sort((a, b) => a.seed - b.seed);

	const S = nextPow2(entrants.length);
	const byes = S - entrants.length;
	const rounds = Math.log2(S);

	function seedPositions(size: number): number[] {
		if (size === 1) return [0];
		const prev = seedPositions(size / 2);
		const result: number[] = [];
		for (const p of prev) {
			result.push(p);
			result.push(size - 1 - p);
		}
		return result;
	}
	const positions = seedPositions(S);
	const leaves: (string | null)[] = Array(S).fill(null);
	for (let i = 0; i < entrants.length; i++) {
		leaves[positions[i]] = entrants[i].teamId;
	}

	const roundMatches: string[][] = Array.from({ length: rounds + 1 }, () => []);

	for (let r = rounds; r >= 1; r--) {
		const numMatches = S / 2 ** r;
		for (let j = 0; j < numMatches; j++) {
			let homeTeamId: string | null = null;
			let awayTeamId: string | null = null;
			let status: "scheduled" | "finished" = "scheduled";
			let winnerTeamId: string | null = null;

			if (r === 1) {
				const left = leaves[2 * j];
				const right = leaves[2 * j + 1];
				homeTeamId = left;
				awayTeamId = right;
				if (left && !right) {
					status = "finished";
					winnerTeamId = left;
				} else if (!left && right) {
					status = "finished";
					winnerTeamId = right;
				} else if (!left && !right) {
					// Doble bye: no hay partido.
					continue;
				}
			}

			const nextMatchId =
				r < rounds ? roundMatches[r + 1][Math.floor(j / 2)] : null;
			const nextMatchSlot = r < rounds ? (j % 2 === 0 ? "home" : "away") : null;

			const [created] = await db
				.insert(matches)
				.values({
					stageId,
					roundNumber: r,
					matchNumber: j + 1,
					homeTeamId,
					awayTeamId,
					status,
					winnerTeamId,
					homeScore: 0,
					awayScore: 0,
					nextMatchId: nextMatchId ?? null,
					nextMatchSlot: (nextMatchSlot as "home" | "away" | null) ?? null,
				})
				.returning();
			roundMatches[r].push(created.id);

			if (r === 1 && winnerTeamId && nextMatchId && nextMatchSlot) {
				await db
					.update(matches)
					.set(
						nextMatchSlot === "home"
							? { homeTeamId: winnerTeamId }
							: { awayTeamId: winnerTeamId },
					)
					.where(eq(matches.id, nextMatchId));
			}
		}
	}

	let created = 0;
	for (let r = 1; r <= rounds; r++) created += roundMatches[r].length;

	return { created, rounds, byes };
}

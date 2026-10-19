/**
 * Catálogo de deportes preconfigurados.
 *
 * Cada fila de `sports` es un deporte con su propio reglamento: una variante
 * (fútbol sala, básquetbol 3×3, voleibol playa) no es una jerarquía sino otra
 * configuración —periodos, empates y puntos—, porque es exactamente eso lo que
 * cambia entre una y otra. Por eso el catálogo no tiene `parentId`: el nombre
 * carga la familia ("Fútbol sala") y la fila carga el reglamento
 * (`docs/decided.md`).
 *
 * Los `code` de los eventos van en inglés snake_case, como el contrato de
 * `matchEvent`; los `name` son la etiqueta que ve el operador, en español.
 * `defaultValue` es lo que suma al marcador cuando `affectsScore` es verdadero
 * (ver `recordLiveEvent`): un triple vale 3, un tiro libre 1.
 *
 * Sembrar es aditivo: inserta lo que falta y no borra ni pisa lo existente.
 * `force` refresca la configuración de las filas del catálogo; un deporte
 * ajeno al catálogo no se toca nunca.
 */
import { and, eq } from "drizzle-orm";
import { db as defaultDb } from "../index";
import { sportEventTypes, sports } from "../tables";

export type SportEventTypeSeed = {
	code: string;
	name: string;
	affectsScore: boolean;
	defaultValue: number;
};

export type SportSeed = {
	id: string;
	name: string;
	hasDraws: boolean;
	periodName: string;
	regularPeriods: number;
	scoringRules: Record<string, number>;
	eventTypes: readonly SportEventTypeSeed[];
};

const FOOTBALL_EVENTS: readonly SportEventTypeSeed[] = [
	{ code: "goal", name: "Gol", affectsScore: true, defaultValue: 1 },
	{
		code: "own_goal",
		name: "Gol en propia",
		affectsScore: true,
		defaultValue: 1,
	},
	{
		code: "penalty_goal",
		name: "Gol de penalti",
		affectsScore: true,
		defaultValue: 1,
	},
	{
		code: "penalty_missed",
		name: "Penalti fallado",
		affectsScore: false,
		defaultValue: 0,
	},
	{
		code: "yellow_card",
		name: "Tarjeta amarilla",
		affectsScore: false,
		defaultValue: 0,
	},
	{
		code: "red_card",
		name: "Tarjeta roja",
		affectsScore: false,
		defaultValue: 0,
	},
	{
		code: "substitution",
		name: "Sustitución",
		affectsScore: false,
		defaultValue: 0,
	},
];

const BASKETBALL_EVENTS: readonly SportEventTypeSeed[] = [
	{
		code: "two_point",
		name: "Canasta de 2",
		affectsScore: true,
		defaultValue: 2,
	},
	{
		code: "three_point",
		name: "Canasta de 3",
		affectsScore: true,
		defaultValue: 3,
	},
	{
		code: "free_throw",
		name: "Tiro libre",
		affectsScore: true,
		defaultValue: 1,
	},
	{ code: "foul", name: "Falta", affectsScore: false, defaultValue: 0 },
	{
		code: "timeout",
		name: "Tiempo fuera",
		affectsScore: false,
		defaultValue: 0,
	},
	{
		code: "substitution",
		name: "Sustitución",
		affectsScore: false,
		defaultValue: 0,
	},
];

const THREE_ON_THREE_EVENTS: readonly SportEventTypeSeed[] = [
	{
		code: "one_point",
		name: "Canasta de 1",
		affectsScore: true,
		defaultValue: 1,
	},
	{
		code: "two_point",
		name: "Canasta de 2",
		affectsScore: true,
		defaultValue: 2,
	},
	{
		code: "free_throw",
		name: "Tiro libre",
		affectsScore: true,
		defaultValue: 1,
	},
	{ code: "foul", name: "Falta", affectsScore: false, defaultValue: 0 },
	{
		code: "timeout",
		name: "Tiempo fuera",
		affectsScore: false,
		defaultValue: 0,
	},
	{
		code: "substitution",
		name: "Sustitución",
		affectsScore: false,
		defaultValue: 0,
	},
];

// El evento suma al equipo que lo registra, así que no hay un "error que da
// punto al rival": el árbitro anota `point` al lado que ganó el punto.
const VOLLEYBALL_EVENTS: readonly SportEventTypeSeed[] = [
	{ code: "point", name: "Punto", affectsScore: true, defaultValue: 1 },
	{ code: "ace", name: "Ace", affectsScore: true, defaultValue: 1 },
	{ code: "block", name: "Bloqueo", affectsScore: true, defaultValue: 1 },
	{
		code: "timeout",
		name: "Tiempo fuera",
		affectsScore: false,
		defaultValue: 0,
	},
	{
		code: "substitution",
		name: "Sustitución",
		affectsScore: false,
		defaultValue: 0,
	},
];

const BASEBALL_EVENTS: readonly SportEventTypeSeed[] = [
	{ code: "run", name: "Carrera", affectsScore: true, defaultValue: 1 },
	{ code: "home_run", name: "Jonrón", affectsScore: true, defaultValue: 1 },
	{ code: "strikeout", name: "Ponche", affectsScore: false, defaultValue: 0 },
	{
		code: "walk",
		name: "Base por bolas",
		affectsScore: false,
		defaultValue: 0,
	},
	{ code: "error", name: "Error", affectsScore: false, defaultValue: 0 },
];

const TENNIS_EVENTS: readonly SportEventTypeSeed[] = [
	{ code: "set_won", name: "Set ganado", affectsScore: true, defaultValue: 1 },
	{
		code: "game_won",
		name: "Juego ganado",
		affectsScore: false,
		defaultValue: 0,
	},
	{ code: "ace", name: "Ace", affectsScore: false, defaultValue: 0 },
	{
		code: "double_fault",
		name: "Doble falta",
		affectsScore: false,
		defaultValue: 0,
	},
];

export const SPORTS_CATALOG: readonly SportSeed[] = [
	{
		id: "football",
		name: "Fútbol 11",
		hasDraws: true,
		periodName: "tiempo",
		regularPeriods: 2,
		scoringRules: { win: 3, draw: 1, loss: 0 },
		eventTypes: FOOTBALL_EVENTS,
	},
	{
		id: "futsal",
		name: "Fútbol sala",
		hasDraws: true,
		periodName: "tiempo",
		regularPeriods: 2,
		scoringRules: { win: 3, draw: 1, loss: 0 },
		eventTypes: FOOTBALL_EVENTS,
	},
	{
		id: "football-7",
		name: "Fútbol 7",
		hasDraws: true,
		periodName: "tiempo",
		regularPeriods: 2,
		scoringRules: { win: 3, draw: 1, loss: 0 },
		eventTypes: FOOTBALL_EVENTS,
	},
	{
		id: "basketball",
		name: "Básquetbol 5×5",
		hasDraws: false,
		periodName: "cuarto",
		regularPeriods: 4,
		scoringRules: { win: 2, draw: 0, loss: 1 },
		eventTypes: BASKETBALL_EVENTS,
	},
	{
		id: "basketball-3x3",
		name: "Básquetbol 3×3",
		hasDraws: false,
		periodName: "periodo",
		regularPeriods: 1,
		scoringRules: { win: 2, draw: 0, loss: 1 },
		eventTypes: THREE_ON_THREE_EVENTS,
	},
	{
		id: "volleyball",
		name: "Voleibol",
		hasDraws: false,
		periodName: "set",
		regularPeriods: 5,
		scoringRules: { win: 2, draw: 0, loss: 1 },
		eventTypes: VOLLEYBALL_EVENTS,
	},
	{
		id: "beach-volleyball",
		name: "Voleibol playa",
		hasDraws: false,
		periodName: "set",
		regularPeriods: 3,
		scoringRules: { win: 2, draw: 0, loss: 1 },
		eventTypes: VOLLEYBALL_EVENTS,
	},
	{
		id: "baseball",
		name: "Béisbol",
		hasDraws: false,
		periodName: "entrada",
		regularPeriods: 9,
		scoringRules: { win: 1, draw: 0, loss: 0 },
		eventTypes: BASEBALL_EVENTS,
	},
	{
		id: "softball",
		name: "Sóftbol",
		hasDraws: false,
		periodName: "entrada",
		regularPeriods: 7,
		scoringRules: { win: 1, draw: 0, loss: 0 },
		eventTypes: BASEBALL_EVENTS,
	},
	{
		id: "tennis",
		name: "Tenis (3 sets)",
		hasDraws: false,
		periodName: "set",
		regularPeriods: 3,
		scoringRules: { win: 1, draw: 0, loss: 0 },
		eventTypes: TENNIS_EVENTS,
	},
	{
		id: "tennis-best-of-5",
		name: "Tenis (5 sets)",
		hasDraws: false,
		periodName: "set",
		regularPeriods: 5,
		scoringRules: { win: 1, draw: 0, loss: 0 },
		eventTypes: TENNIS_EVENTS,
	},
];

export type CatalogSeedReport = {
	force: boolean;
	sports: { created: string[]; updated: string[]; unchanged: string[] };
	eventTypes: { created: number; updated: number; unchanged: number };
};

type Db = typeof defaultDb;

/**
 * Siembra el catálogo en la base que se le pase (por defecto, la de la app).
 *
 * Sin `force` sólo inserta filas ausentes: un deporte o un evento que el
 * organizador ya editó se respeta. Con `force` reescribe la configuración de
 * las filas del catálogo, sin tocar deportes ni eventos que no estén en él.
 */
export async function seedSports(
	options: { db?: Db; force?: boolean } = {},
): Promise<CatalogSeedReport> {
	const database = options.db ?? defaultDb;
	const force = options.force ?? false;
	const report: CatalogSeedReport = {
		force,
		sports: { created: [], updated: [], unchanged: [] },
		eventTypes: { created: 0, updated: 0, unchanged: 0 },
	};

	await database.transaction(async (tx) => {
		for (const seed of SPORTS_CATALOG) {
			const [existing] = await tx
				.select({ id: sports.id })
				.from(sports)
				.where(eq(sports.id, seed.id))
				.limit(1);

			if (!existing) {
				await tx.insert(sports).values({
					id: seed.id,
					name: seed.name,
					hasDraws: seed.hasDraws,
					periodName: seed.periodName,
					regularPeriods: seed.regularPeriods,
					scoringRules: seed.scoringRules,
				});
				report.sports.created.push(seed.id);
			} else if (force) {
				await tx
					.update(sports)
					.set({
						name: seed.name,
						hasDraws: seed.hasDraws,
						periodName: seed.periodName,
						regularPeriods: seed.regularPeriods,
						scoringRules: seed.scoringRules,
					})
					.where(eq(sports.id, seed.id));
				report.sports.updated.push(seed.id);
			} else {
				report.sports.unchanged.push(seed.id);
			}

			for (const event of seed.eventTypes) {
				const [existingEvent] = await tx
					.select({ id: sportEventTypes.id })
					.from(sportEventTypes)
					.where(
						and(
							eq(sportEventTypes.sportId, seed.id),
							eq(sportEventTypes.code, event.code),
						),
					)
					.limit(1);

				if (!existingEvent) {
					await tx.insert(sportEventTypes).values({
						sportId: seed.id,
						code: event.code,
						name: event.name,
						affectsScore: event.affectsScore,
						defaultValue: event.defaultValue,
					});
					report.eventTypes.created++;
				} else if (force) {
					await tx
						.update(sportEventTypes)
						.set({
							name: event.name,
							affectsScore: event.affectsScore,
							defaultValue: event.defaultValue,
						})
						.where(eq(sportEventTypes.id, existingEvent.id));
					report.eventTypes.updated++;
				} else {
					report.eventTypes.unchanged++;
				}
			}
		}
	});

	return report;
}

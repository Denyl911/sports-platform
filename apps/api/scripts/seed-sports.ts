/**
 * Seed del catálogo de deportes preconfigurados (fútbol, básquetbol,
 * voleibol, béisbol y tenis, con sus variantes más comunes) y de los tipos de
 * evento de cada uno.
 *
 * Uso:
 *   bun run db:seed:sports            # inserta lo que falta, respeta lo editado
 *   bun run db:seed:sports -- --force # además refresca la configuración
 *
 * El catálogo vive en `packages/db/src/seed/sports.ts` (una sola fuente, con
 * test de coherencia). Sembrar dos veces no duplica: la segunda corrida no
 * crea filas. Nunca borra, y un deporte ajeno al catálogo no se toca.
 */
import { db } from "@sports/db";
import { seedSports } from "@sports/db/seed/sports";

const force = process.argv.includes("--force");
const report = await seedSports({ db, force });

console.log(
	`Deportes: ${report.sports.created.length} creados, ${report.sports.updated.length} actualizados, ${report.sports.unchanged.length} sin cambios.`,
);
console.log(
	`Tipos de evento: ${report.eventTypes.created} creados, ${report.eventTypes.updated} actualizados, ${report.eventTypes.unchanged} sin cambios.`,
);

if (report.sports.created.length > 0) {
	console.log(`  Nuevos: ${report.sports.created.join(", ")}`);
}

if (force) {
	console.log("  Configuración refrescada desde el catálogo (--force).");
} else if (report.sports.created.length === 0) {
	console.log(
		"  Los deportes ya existían; usá `--force` para refrescar su configuración.",
	);
}

process.exit(0);

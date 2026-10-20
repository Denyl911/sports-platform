import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core/checks";
import { integer, uuid } from "drizzle-orm/pg-core/columns";
import { index, uniqueIndex } from "drizzle-orm/pg-core/indexes";
import { pgTable } from "drizzle-orm/pg-core/table";
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { stageGroups } from "./stage-groups";
import { teams } from "./teams";
import { tournamentStages } from "./tournament-stages";

export const stageTeamRegistrations = pgTable(
	"stage_team_registrations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		stageId: uuid("stage_id")
			.references(() => tournamentStages.id, { onDelete: "cascade" })
			.notNull(),
		groupId: uuid("group_id").references(() => stageGroups.id, {
			onDelete: "cascade",
		}),
		teamId: uuid("team_id")
			.references(() => teams.id, { onDelete: "cascade" })
			.notNull(),
		seedNumber: integer("seed_number"),
		// Orden dentro del grupo (0-based). `seedNumber` sigue siendo la semilla
		// global de la etapa; esto solo mueve filas en el tablero de grupos.
		position: integer("position"),
	},
	(t) => [
		unique("stage_team_unique").on(t.stageId, t.teamId),
		uniqueIndex("group_team_unique")
			.on(t.groupId, t.teamId)
			.where(sql`${t.groupId} IS NOT NULL`),
		check("seed_number_positive", sql`${t.seedNumber} > 0`),
		check("registration_position_non_negative", sql`${t.position} >= 0`),
		// Índices de consulta
		index("stage_team_registrations_team_id_idx").on(t.teamId),
	],
);

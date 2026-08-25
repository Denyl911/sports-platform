import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { AnyPgColumn } from "drizzle-orm/pg-core/columns";
import { check } from "drizzle-orm/pg-core/checks";
import { tournamentStages } from "./tournament-stages";
import { stageGroups } from "./stage-groups";
import { teams } from "./teams";
import { venues } from "./venues";
import { matchSlotEnum, matchStatusEnum } from "./enums";

export const matches = pgTable(
	"matches",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		stageId: uuid("stage_id")
			.references(() => tournamentStages.id, { onDelete: "cascade" })
			.notNull(),
		groupId: uuid("group_id").references(() => stageGroups.id, {
			onDelete: "cascade",
		}),
		roundNumber: integer("round_number").default(1).notNull(),
		matchNumber: integer("match_number"),

		homeTeamId: uuid("home_team_id").references(() => teams.id),
		awayTeamId: uuid("away_team_id").references(() => teams.id),
		winnerTeamId: uuid("winner_team_id").references(() => teams.id),

		venueId: uuid("venue_id").references(() => venues.id),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
		status: matchStatusEnum("status").default("scheduled").notNull(),

		homeScore: integer("home_score").default(0).notNull(),
		awayScore: integer("away_score").default(0).notNull(),

		// Progresión de llaves (Self-references)
		nextMatchId: uuid("next_match_id").references(
			(): AnyPgColumn => matches.id,
		),
		nextMatchSlot: matchSlotEnum("next_match_slot"),
		loserNextMatchId: uuid("loser_next_match_id").references(
			(): AnyPgColumn => matches.id,
		),
		loserNextMatchSlot: matchSlotEnum("loser_next_match_slot"),

		metadata: jsonb("metadata").default({}).notNull(),
	},
	(t) => [
		check(
			"no_self_match",
			sql`${t.homeTeamId} IS NULL OR ${t.awayTeamId} IS NULL OR ${t.homeTeamId} <> ${t.awayTeamId}`,
		),
		check("home_score_non_negative", sql`${t.homeScore} >= 0`),
		check("away_score_non_negative", sql`${t.awayScore} >= 0`),
		// Índices de consulta
		index("matches_stage_id_idx").on(t.stageId),
		index("matches_group_id_idx").on(t.groupId),
		index("matches_status_idx").on(t.status),
		index("matches_scheduled_at_idx").on(t.scheduledAt),
	],
);

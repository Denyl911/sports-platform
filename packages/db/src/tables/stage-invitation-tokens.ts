import {
	boolean,
	integer,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core/columns";
import { index, uniqueIndex } from "drizzle-orm/pg-core/indexes";
import { pgTable } from "drizzle-orm/pg-core/table";
import { tournamentStages } from "./tournament-stages";
import { users } from "./users";

export const stageInvitationTokens = pgTable(
	"stage_invitation_tokens",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		stageId: uuid("stage_id")
			.references(() => tournamentStages.id, { onDelete: "cascade" })
			.notNull(),
		token: varchar("token", { length: 64 }).notNull().unique(),
		createdBy: uuid("created_by")
			.references(() => users.id)
			.notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		maxUses: integer("max_uses"),
		usesCount: integer("uses_count").default(0).notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		uniqueIndex("stage_invitation_token_unique").on(t.token),
		index("stage_invitation_tokens_stage_id_idx").on(t.stageId),
	],
);

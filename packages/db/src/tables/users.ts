import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core/checks";
import {
	boolean,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core/columns";
import { index } from "drizzle-orm/pg-core/indexes";
import { pgTable } from "drizzle-orm/pg-core/table";
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { userRoleEnum } from "./enums";
import { tournaments } from "./tournaments";

export const users = pgTable(
	"users",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		email: varchar("email", { length: 255 }).notNull().unique(),
		// Hash local (Bun.password). Nullable para futuro OAuth.
		passwordHash: text("password_hash"),
		fullName: varchar("full_name", { length: 120 }).notNull(),
		role: userRoleEnum("role").default("viewer_staff").notNull(),
		isActive: boolean("is_active").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		index("users_role_idx").on(t.role),
		check(
			"user_email_valid",
			sql`${t.email} ~* '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$'`,
		),
		check(
			"user_auth_method_present",
			sql`${t.passwordHash} IS NOT NULL`, // se relajará al integrar OAuth
		),
	],
);

// Membresías por torneo (RBAC con scope): un usuario puede tener un rol distinto en cada torneo
export const tournamentMembers = pgTable(
	"tournament_members",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		tournamentId: uuid("tournament_id")
			.references(() => tournaments.id, { onDelete: "cascade" })
			.notNull(),
		userId: uuid("user_id")
			.references(() => users.id, { onDelete: "cascade" })
			.notNull(),
		role: userRoleEnum("role").default("viewer_staff").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		unique("tournament_member_unique").on(t.tournamentId, t.userId),
		// Índices de consulta
		index("tournament_members_user_id_idx").on(t.userId),
	],
);

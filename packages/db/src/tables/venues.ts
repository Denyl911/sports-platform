import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core/checks";
import {
	doublePrecision,
	integer,
	text,
	uuid,
	varchar,
} from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";

export const venues = pgTable(
	"venues",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: varchar("name", { length: 100 }).notNull(),
		address: text("address"),
		fieldCount: integer("field_count").default(1).notNull(),
		latitude: doublePrecision("latitude"),
		longitude: doublePrecision("longitude"),
	},
	(t) => [check("field_count_non_negative", sql`${t.fieldCount} >= 0`)],
);

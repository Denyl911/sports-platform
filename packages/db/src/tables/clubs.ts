import { uuid, varchar, text } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { timestamp } from "drizzle-orm/pg-core/columns";

export const clubs = pgTable("clubs", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: varchar("name", { length: 100 }).notNull().unique(),
	logoUrl: text("logo_url"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

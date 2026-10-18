import { drizzle } from "drizzle-orm/bun-sql";
import { relations } from "./relations";

// ---------------------------------------------------------------------------
// Query ledger — the counter behind the queries-per-request axis.
//
// Opt-in through `DRIZZLE_COUNT=1` (apps/api/test/query-budgets.test.ts sets
// it): when it is off, every query pays one env check, nothing else, and
// production never collects anything.
// ---------------------------------------------------------------------------

export type QueryLogEntry = { query: string; params: unknown[] };

export const queryLedger: QueryLogEntry[] = [];

export const db = drizzle({
	connection: process.env.DATABASE_URL!,
	relations,
	logger: {
		logQuery(query: string, params: unknown[]) {
			if (process.env.DRIZZLE_COUNT === "1") {
				queryLedger.push({ query, params });
			}
		},
	},
});

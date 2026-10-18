#!/usr/bin/env bun
/**
 * The queries-per-request axis, as a test: every row pins how many round
 * trips one call of that route takes. A budget that grows is a pull request
 * conversation (the axis row in AGENTS.md), never a silent N+1.
 *
 * The ledger is gathered by @sports/db's logger behind `DRIZZLE_COUNT=1`;
 * seeding happens before the ledger window, so every count below is the
 * route's own call. Budgets were measured by running this suite at the
 * commit that added each row; a change moves a budget the honest way:
 * measure, change the row with the new number, say why in the PR's axis
 * table.
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { queryLedger } from "@sports/db";
import { app } from "../src/app";
import {
	resetDb,
	seedEdition,
	seedMatch,
	seedRegistration,
	seedStage,
	seedTeam,
	seedTournament,
} from "./helpers/db";

process.env.DRIZZLE_COUNT = "1";

const api = treaty(app);

type Row = {
	label: string;
	budget: number;
	call: () => Promise<unknown>;
};

function countQueries(
	label: string,
	budget: number,
	promise: () => Promise<unknown>,
) {
	return async () => {
		queryLedger.length = 0;
		await promise();
		const spent = queryLedger.length;
		const log = queryLedger
			.slice(0, 6)
			.map((e) => `    - ${e.query.slice(0, 120)}`)
			.join("\n");
		expect(
			spent,
			`${label}: ${spent} queries against a budget of ${budget}\n${log}\n  a new round trip needs the budget row and the axis table in the PR; it does not ride on this test's failure`,
		).toBeLessThanOrEqual(budget);
	};
}

describe("query budgets", () => {
	beforeEach(resetDb);

	it("the public list endpoints stay at their declared round trips", async () => {
		const rows: Row[] = [
			{
				label: "GET /matches (empty, no filters)",
				budget: 2,
				call: () => api.matches.get({ query: {} }),
			},
			{
				label: "GET /matches (full world, no filters)",
				budget: 2,
				call: async () => {
					const tournament = await seedTournament();
					const edition = await seedEdition(tournament.id);
					const stage = await seedStage(edition.id);
					const home = await seedTeam();
					const away = await seedTeam();
					await seedRegistration(stage.id, home.id);
					await seedRegistration(stage.id, away.id);
					await seedMatch(stage.id, {
						homeTeamId: home.id,
						awayTeamId: away.id,
					});
					queryLedger.length = 0;
					return api.matches.get({ query: {} });
				},
			},
			{
				label: "GET /tournaments",
				budget: 2,
				call: () => api.tournaments.get(),
			},
			{ label: "GET /sports", budget: 2, call: () => api.sports.get() },
			{ label: "GET /venues", budget: 2, call: () => api.venues.get() },
			{ label: "GET /clubs", budget: 2, call: () => api.clubs.get() },
			{
				label: "GET /teams",
				budget: 2,
				call: () => api.teams.get({ query: {} }),
			},
			{ label: "GET /players", budget: 2, call: () => api.players.get() },
		];

		for (const row of rows) {
			const measure = countQueries(row.label, row.budget, row.call);
			await measure();
		}
	});
});

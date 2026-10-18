import { beforeEach, describe, expect, it } from "bun:test";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import { resetDb, seedUser } from "./helpers/db";

/**
 * The error contract, walked through the real app (the dynamic half of
 * ADR 004; `errors` in scripts/checks.ts is its static half). Every row is
 * a failure that must arrive with the status and the shape its route
 * declares: a `message` a client can read, whatever the failure was. An
 * error that arrives as anything else is a violation, even if the status
 * is right.
 *
 * Rows go through `app.handle` — raw responses, no treaty typing, so the
 * test reads what a client on the wire reads.
 */

const GHOST = "00000000-0000-0000-0000-000000000000";

type Row = {
	name: string;
	status: number;
	run: (headers: Record<string, string>) => Promise<Response>;
};

async function expectRow(
	row: { name: string; status: number },
	response: Response,
) {
	const body = await response.json().catch(() => null);
	expect(
		response.status,
		`${row.name}: expected ${row.status}, got ${response.status} with ${JSON.stringify(body)}`,
	).toBe(row.status);
	expect(
		body,
		`${row.name}: the body must be the error contract — an object with a 'message' a client reads (ADR 004)`,
	).toBeObject();
	expect(
		typeof (body as { message?: unknown })?.message,
		`${row.name}: 'message' is the field the client reads (ADR 004), got ${JSON.stringify(body)}`,
	).toBe("string");
}

describe("error contract", () => {
	beforeEach(resetDb);

	it("every declared failure arrives with its status and a readable message", async () => {
		const plainUser = await seedUser({ role: "viewer_staff" });
		const plainHeaders = await authHeaders(plainUser);
		await seedUser({ role: "admin" });

		const rows: Row[] = [
			{
				name: "POST /clubs without a token",
				status: 401,
				run: () =>
					app.handle(
						new Request("http://localhost/clubs", {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({ name: "Club X" }),
						}),
					),
			},
			{
				name: "POST /clubs as a plain user",
				status: 403,
				run: (headers) =>
					app.handle(
						new Request("http://localhost/clubs", {
							method: "POST",
							headers: { ...headers, "content-type": "application/json" },
							body: JSON.stringify({ name: "Club X" }),
						}),
					),
			},
			{
				name: "POST /clubs with a body that does not parse",
				status: 400,
				run: (headers) =>
					app.handle(
						new Request("http://localhost/clubs", {
							method: "POST",
							headers: { ...headers, "content-type": "application/json" },
							body: JSON.stringify({}),
						}),
					),
			},
			{
				name: "GET /matches/<ghost id>",
				status: 404,
				run: () => app.handle(new Request(`http://localhost/matches/${GHOST}`)),
			},
			{
				name: "GET /clubs/<ghost id>",
				status: 404,
				run: () => app.handle(new Request(`http://localhost/clubs/${GHOST}`)),
			},
		];

		// run each row with its own headers
		for (const row of rows) {
			const headers =
				row.name.includes("without a token") || row.name.includes("<ghost")
					? {}
					: plainHeaders;
			const response = await row.run(headers as Record<string, string>);
			await expectRow(row, response);
		}
	});

	it("duplicate club names arrive as the declared 409", async () => {
		const admin = await seedUser({ role: "admin" });
		const headers = await authHeaders(admin);
		// one name, two posts: the same ms cannot be trusted to repeat
		const name = `Club ${Date.now()}`;

		const first = await app.handle(
			new Request("http://localhost/clubs", {
				method: "POST",
				headers: { ...headers, "content-type": "application/json" },
				body: JSON.stringify({ name }),
			}),
		);
		expect(first.status).toBe(200);

		const second = await app.handle(
			new Request("http://localhost/clubs", {
				method: "POST",
				headers: { ...headers, "content-type": "application/json" },
				body: JSON.stringify({ name }),
			}),
		);
		await expectRow(
			{ name: "POST /clubs duplicate name", status: 409 },
			second,
		);
	});
});

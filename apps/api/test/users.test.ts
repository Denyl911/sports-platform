import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { tournamentMembers, users } from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import type { UserRow } from "./helpers/db";
import { resetDb, seedMember, seedTournament, seedUser } from "./helpers/db";

const api = treaty(app);

describe("users - GET /users (list, filtros, RBAC, paginación)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("401 sin token, 403 para roles no admin", async () => {
		const unauth = await api.users.get();
		expect(unauth.status).toBe(401);

		const viewer = await seedUser({ role: "viewer_staff" });
		const organizer = await seedUser({ role: "organizer" });
		const referee = await seedUser({ role: "referee" });

		for (const u of [viewer, organizer, referee]) {
			const res = await api.users.get({ headers: await authHeaders(u) });
			expect(res.status).toBe(403);
		}
	});

	it("200 para admin y super_admin, con paginación y total", async () => {
		const admin = await seedUser({ role: "admin", fullName: "Admin" });
		const superAdmin = await seedUser({
			role: "super_admin",
			fullName: "Super",
		});
		await seedUser({ role: "organizer", fullName: "Alice" });
		await seedUser({ role: "organizer", fullName: "Bob" });
		await seedUser({ role: "referee", fullName: "Charlie" });

		// admin
		const res = await api.users.get({ headers: await authHeaders(admin) });
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("no data");
		expect(res.data.total).toBe(5);
		expect(res.data.items.length).toBe(5);
		// orden asc por fullName
		const names = res.data.items.map((u) => u.fullName);
		expect(names).toEqual([...names].sort());

		// super_admin también
		const superRes = await api.users.get({
			headers: await authHeaders(superAdmin),
		});
		expect(superRes.status).toBe(200);

		// limit/offset
		const paged = await api.users.get({
			query: { limit: 2, offset: 1 } as never,
			headers: await authHeaders(admin),
		});
		expect(paged.status).toBe(200);
		if (!paged.data) throw new Error("no data");
		expect(paged.data.items.length).toBe(2);
		expect(paged.data.total).toBe(5);
	});

	it("400 para query inválida", async () => {
		const admin = await seedUser({ role: "admin" });
		const badLimit = await api.users.get({
			query: { limit: 0 as never } as never,
			headers: await authHeaders(admin),
		});
		expect(badLimit.status).toBe(400);

		const badLimitHigh = await api.users.get({
			query: { limit: 101 as never } as never,
			headers: await authHeaders(admin),
		});
		expect(badLimitHigh.status).toBe(400);

		const badRole = await api.users.get({
			query: { role: "invalid" as never } as never,
			headers: await authHeaders(admin),
		});
		expect(badRole.status).toBe(400);
	});

	it("filtros role + isActive y passwordHash nunca expuesto", async () => {
		const admin = await seedUser({ role: "admin" });
		await seedUser({
			role: "organizer",
			isActive: true,
			fullName: "Active Org",
		});
		await seedUser({
			role: "organizer",
			isActive: false,
			fullName: "Inactive Org",
		});
		await seedUser({ role: "referee", isActive: true });

		const filtered = await api.users.get({
			query: { role: "organizer", isActive: true } as never,
			headers: await authHeaders(admin),
		});
		expect(filtered.status).toBe(200);
		if (!filtered.data) throw new Error("no data");
		expect(filtered.data.items.length).toBe(1);
		expect(filtered.data.items[0]?.role).toBe("organizer");
		expect(JSON.stringify(filtered.data)).not.toContain("passwordHash");
	});

	it("filtros vacíos retornan todos", async () => {
		const admin = await seedUser({ role: "admin" });
		const empty = await api.users.get({ headers: await authHeaders(admin) });
		expect(empty.status).toBe(200);
	});
});

describe("users - GET /users/:userId y POST /users", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("GET /users/:userId RBAC y 404/400", async () => {
		const admin = await seedUser({ role: "admin" });
		const target = await seedUser({ role: "viewer_staff" });

		const ok = await api
			.users({ userId: target.id })
			.get({ headers: await authHeaders(admin) });
		expect(ok.status).toBe(200);
		expect(ok.data?.id).toBe(target.id);
		expect(JSON.stringify(ok.data)).not.toContain("passwordHash");

		const badUuid = await api.users({ userId: "not-uuid" as never }).get({
			headers: await authHeaders(admin),
		});
		expect(badUuid.status).toBe(400);

		const notFound = await api.users({ userId: crypto.randomUUID() }).get({
			headers: await authHeaders(admin),
		});
		expect(notFound.status).toBe(404);

		const viewer = await seedUser({ role: "viewer_staff" });
		const forbidden = await api.users({ userId: target.id }).get({
			headers: await authHeaders(viewer),
		});
		expect(forbidden.status).toBe(403);
	});

	it("POST /users validación, lowercasing y 409", async () => {
		const admin = await seedUser({ role: "admin" });

		// 400 invalid email, password corto, fullName vacío
		const badEmail = await api.users.post(
			{
				email: "not-an-email",
				password: "password123",
				fullName: "Test",
			} as never,
			{ headers: await authHeaders(admin) },
		);
		expect(badEmail.status).toBe(400);

		const shortPass = await api.users.post(
			{ email: "a@test.local", password: "short", fullName: "Test" } as never,
			{ headers: await authHeaders(admin) },
		);
		expect(shortPass.status).toBe(400);

		// 200 default role viewer_staff, email lowercased, hash no retornado pero en DB
		const created = await api.users.post(
			{
				email: "NewUser@Test.Local",
				password: "password123",
				fullName: "New User",
			} as never,
			{ headers: await authHeaders(admin) },
		);
		expect(created.status).toBe(200);
		expect(created.data?.email).toBe("newuser@test.local");
		expect(created.data?.role).toBe("viewer_staff");
		expect(JSON.stringify(created.data)).not.toContain("passwordHash");

		const [row] = await db
			.select()
			.from(users)
			.where(eq(users.email, "newuser@test.local"))
			.limit(1);
		expect(row?.passwordHash).toBeDefined();
		expect(await Bun.password.verify("password123", row!.passwordHash!)).toBe(
			true,
		);

		// 409 duplicado case-insensitive
		const dup = await api.users.post(
			{
				email: "NEWUSER@test.local",
				password: "password123",
				fullName: "Dup",
			} as never,
			{ headers: await authHeaders(admin) },
		);
		expect(dup.status).toBe(409);
	});

	it("POST /users concurrente mismo email -> 200 y 409", async () => {
		const admin = await seedUser({ role: "admin" });
		const email = `concurrent-${Date.now()}@test.local`;

		const results = await Promise.all([
			api.users.post(
				{ email, password: "password123", fullName: "A" } as never,
				{
					headers: await authHeaders(admin),
				},
			),
			api.users.post(
				{
					email: email.toUpperCase(),
					password: "password123",
					fullName: "B",
				} as never,
				{
					headers: await authHeaders(admin),
				},
			),
		]);
		const statuses = results.map((r) => r.status).sort();
		expect(statuses).toEqual([200, 409]);
	});
});

describe("users - PATCH /users/:userId y DELETE", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("PATCH actualiza parcial y ignora passwordHash", async () => {
		const admin = await seedUser({ role: "admin" });
		const target = await seedUser({
			role: "viewer_staff",
			fullName: "Old Name",
		});

		const [before] = await db
			.select()
			.from(users)
			.where(eq(users.id, target.id))
			.limit(1);
		const hashBefore = before?.passwordHash;

		const patched = await api.users({ userId: target.id }).patch(
			{
				fullName: "New Name",
				isActive: false,
				passwordHash: "should-be-ignored",
			} as never,
			{ headers: await authHeaders(admin) },
		);
		expect(patched.status).toBe(200);
		expect(patched.data?.fullName).toBe("New Name");
		expect(patched.data?.isActive).toBe(false);
		expect(JSON.stringify(patched.data)).not.toContain("passwordHash");

		const [after] = await db
			.select()
			.from(users)
			.where(eq(users.id, target.id))
			.limit(1);
		expect(after?.passwordHash).toBe(hashBefore);
	});

	it("PATCH 409 email duplicado y 400 role inválido", async () => {
		const admin = await seedUser({ role: "admin" });
		const a = await seedUser({ email: "a@test.local" });
		const b = await seedUser({ email: "b@test.local" });

		const dup = await api
			.users({ userId: b.id })
			.patch({ email: "a@test.local" } as never, {
				headers: await authHeaders(admin),
			});
		expect(dup.status).toBe(409);

		const badRole = await api
			.users({ userId: a.id })
			.patch({ role: "invalid" as never } as never, {
				headers: await authHeaders(admin),
			});
		expect(badRole.status).toBe(400);
	});

	it("DELETE cascada y 404 re-delete", async () => {
		const admin = await seedUser({ role: "admin" });
		const target = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		await seedMember(tournament.id, target.id, "organizer");

		const del = await api.users({ userId: target.id }).delete(undefined, {
			headers: await authHeaders(admin),
		});
		expect(del.status).toBe(200);

		const [members] = await db
			.select()
			.from(tournamentMembers)
			.where(eq(tournamentMembers.userId, target.id))
			.limit(1);
		expect(members).toBeUndefined();

		const again = await api.users({ userId: target.id }).delete(undefined, {
			headers: await authHeaders(admin),
		});
		expect(again.status).toBe(404);

		const badUuid = await api
			.users({ userId: "not-uuid" as never })
			.delete(undefined, {
				headers: await authHeaders(admin),
			});
		expect(badUuid.status).toBe(400);
	});
});

describe("users - membresías RBAC y CRUD", () => {
	let admin: UserRow;
	let organizerMember: UserRow;
	let tournamentId: string;

	beforeEach(async () => {
		await resetDb();
		admin = await seedUser({ role: "admin" });
		const organizerUser = await seedUser({ role: "viewer_staff" });
		organizerMember = organizerUser;
		const tournament = await seedTournament();
		tournamentId = tournament.id;
		await seedMember(tournamentId, organizerUser.id, "organizer");
	});

	it("POST /users/:userId/memberships RBAC y validaciones", async () => {
		const viewer = await seedUser({ role: "viewer_staff" });
		const referee = await seedUser({ role: "viewer_staff" });
		await seedMember(tournamentId, referee.id, "referee");
		const target = await seedUser({ role: "viewer_staff" });

		// viewer sin membresía -> 403
		const forbiddenViewer = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(viewer),
			});
		expect(forbiddenViewer.status).toBe(403);

		// referee del mismo torneo -> 403 (solo organizer)
		const forbiddenReferee = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(referee),
			});
		expect(forbiddenReferee.status).toBe(403);

		// organizer de otro torneo -> 403
		const otherTournament = await seedTournament();
		const otherOrganizer = await seedUser({ role: "viewer_staff" });
		await seedMember(otherTournament.id, otherOrganizer.id, "organizer");
		const forbiddenOther = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(otherOrganizer),
			});
		expect(forbiddenOther.status).toBe(403);

		// organizer del torneo -> 200
		const ok = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(ok.status).toBe(200);
		expect(ok.data?.tournamentId).toBe(tournamentId);

		// admin global bypass -> 200
		const target2 = await seedUser({ role: "viewer_staff" });
		const adminOk = await api
			.users({ userId: target2.id })
			.memberships.post({ tournamentId, role: "referee" } as never, {
				headers: await authHeaders(admin),
			});
		expect(adminOk.status).toBe(200);

		// role admin debe permitirse (según decisión)
		const target3 = await seedUser({ role: "viewer_staff" });
		const adminRole = await api
			.users({ userId: target3.id })
			.memberships.post({ tournamentId, role: "admin" } as never, {
				headers: await authHeaders(admin),
			});
		expect(adminRole.status).toBe(200);

		// falta tournamentId -> 400
		const missing = await api
			.users({ userId: target.id })
			.memberships.post({ role: "viewer_staff" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(missing.status).toBe(400);

		// role inválido -> 400
		const badRole = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "invalid" as never } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(badRole.status).toBe(400);

		// tournamentId inexistente -> 400 (badRequest) con admin bypass
		const ghostTournament = crypto.randomUUID();
		const badTournament = await api
			.users({ userId: target.id })
			.memberships.post(
				{ tournamentId: ghostTournament, role: "viewer_staff" } as never,
				{ headers: await authHeaders(admin) },
			);
		expect(badTournament.status).toBe(400);

		// userId inexistente -> 404
		const ghostUser = crypto.randomUUID();
		const badUser = await api
			.users({ userId: ghostUser })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(badUser.status).toBe(404);

		// duplicado -> 409
		const duplicate = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(duplicate.status).toBe(409);

		// uuid inválido en params
		const badParam = await api
			.users({ userId: "not-uuid" as never })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(badParam.status).toBe(400);
	});

	it("POST /users/:userId/memberships concurrente duplicado", async () => {
		const target = await seedUser({ role: "viewer_staff" });
		const results = await Promise.all([
			api
				.users({ userId: target.id })
				.memberships.post({ tournamentId, role: "referee" } as never, {
					headers: await authHeaders(organizerMember),
				}),
			api
				.users({ userId: target.id })
				.memberships.post({ tournamentId, role: "referee" } as never, {
					headers: await authHeaders(organizerMember),
				}),
		]);
		const statuses = results.map((r) => r.status).sort();
		expect(statuses).toEqual([200, 409]);
	});

	it("PATCH /memberships/:memberId y DELETE", async () => {
		const target = await seedUser({ role: "viewer_staff" });
		const created = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(organizerMember),
			});
		if (!created.data) throw new Error("no membership");
		const memberId = created.data.id;

		// invalid role -> 400
		const badRole = await api
			.memberships({ memberId })
			.patch({ role: "super_admin" as never } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(badRole.status).toBe(400);

		// valid change
		const patched = await api
			.memberships({ memberId })
			.patch({ role: "referee" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(patched.status).toBe(200);
		expect(patched.data?.role).toBe("referee");

		// viewer no puede patch -> 403
		const viewer = await seedUser({ role: "viewer_staff" });
		const forbidden = await api
			.memberships({ memberId })
			.patch({ role: "viewer_staff" } as never, {
				headers: await authHeaders(viewer),
			});
		expect(forbidden.status).toBe(403);

		// 404 ghost
		const ghost = await api
			.memberships({ memberId: crypto.randomUUID() })
			.patch({ role: "referee" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(ghost.status).toBe(404);

		// 400 uuid inválido
		const badUuid = await api
			.memberships({ memberId: "not-uuid" as never })
			.patch({ role: "referee" } as never, {
				headers: await authHeaders(organizerMember),
			});
		expect(badUuid.status).toBe(400);

		// DELETE 403 para viewer
		const delForbidden = await api.memberships({ memberId }).delete(undefined, {
			headers: await authHeaders(viewer),
		});
		expect(delForbidden.status).toBe(403);

		// DELETE 200
		const delOk = await api.memberships({ memberId }).delete(undefined, {
			headers: await authHeaders(organizerMember),
		});
		expect(delOk.status).toBe(200);

		// re-delete 404
		const delAgain = await api.memberships({ memberId }).delete(undefined, {
			headers: await authHeaders(organizerMember),
		});
		expect(delAgain.status).toBe(404);

		// bad uuid delete 400
		const delBad = await api
			.memberships({ memberId: "not-uuid" as never })
			.delete(undefined, {
				headers: await authHeaders(organizerMember),
			});
		expect(delBad.status).toBe(400);
	});

	it("admin global bypass en PATCH/DELETE membresías", async () => {
		const target = await seedUser({ role: "viewer_staff" });
		const created = await api
			.users({ userId: target.id })
			.memberships.post({ tournamentId, role: "viewer_staff" } as never, {
				headers: await authHeaders(organizerMember),
			});
		if (!created.data) throw new Error("no membership");

		const patched = await api
			.memberships({ memberId: created.data.id })
			.patch({ role: "statistician" } as never, {
				headers: await authHeaders(admin),
			});
		expect(patched.status).toBe(200);

		const deleted = await api
			.memberships({ memberId: created.data.id })
			.delete(undefined, {
				headers: await authHeaders(admin),
			});
		expect(deleted.status).toBe(200);
	});
});

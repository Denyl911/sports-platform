import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import { resetDb, seedTeam, seedUser } from "./helpers/db";
import { db } from "@sports/db";
import { clubs } from "@sports/db/tables";

const api = treaty(app);

describe("teams - GET (pública, paginada y filtros)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("GET /teams/ pública paginada, orden asc(name) y filtros", async () => {
		const teamA = await seedTeam("Alpha");
		const teamB = await seedTeam("Beta");
		// Crear equipo con categoría distinta y mismo club para probar filtro clubId
		const clubAId = teamA.clubId!;
		const [gamma] = await db
			.insert((await import("@sports/db/tables")).teams)
			.values({ clubId: clubAId, name: "Gamma", category: "U18" })
			.returning();

		const all = await api.teams.get({ query: {} });
		expect(all.status).toBe(200);
		if (!all.data) throw new Error("no data");
		expect(all.data.total).toBe(3);
		expect(all.data.items.map((t) => t.name)).toEqual([
			"Alpha",
			"Beta",
			"Gamma",
		]);

		const byClub = await api.teams.get({ query: { clubId: clubAId } as never });
		expect(byClub.status).toBe(200);
		if (!byClub.data) throw new Error("no data");
		expect(byClub.data.items.every((t) => t.clubId === clubAId)).toBe(true);

		const byCategory = await api.teams.get({
			query: { category: "U18" } as never,
		});
		expect(byCategory.status).toBe(200);
		if (!byCategory.data) throw new Error("no data");
		expect(byCategory.data.items.length).toBe(1);
		expect(byCategory.data.items[0]?.name).toBe("Gamma");

		// ilike case-insensitive
		const byCategoryUpper = await api.teams.get({
			query: { category: "u18" } as never,
		});
		expect(byCategoryUpper.status).toBe(200);
		if (!byCategoryUpper.data) throw new Error("no data");
		expect(byCategoryUpper.data.items.length).toBe(1);

		void teamB;
		void gamma;
	});
});

describe("teams - GET :id (pública)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("GET /teams/:id pública 200", async () => {
		const team = await seedTeam("Tigres");
		const res = await api.teams({ id: team.id }).get();
		expect(res.status).toBe(200);
		expect(res.data?.id).toBe(team.id);
		expect(res.data?.name).toBe("Tigres");
		expect(res.data?.clubId).toBe(team.clubId);
	});
});

describe("teams - POST (admin, organizer, super_admin)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("POST /teams/ 200 con admin/organizer/super_admin, sin clubId también", async () => {
		const admin = await seedUser({ role: "admin" });
		const organizer = await seedUser({ role: "organizer" });
		const superAdmin = await seedUser({ role: "super_admin" });
		const club = (await seedTeam()).clubId!;

		const asAdmin = await api.teams.post(
			{ name: "TeamAdmin", category: "open", clubId: club } as never,
			{ headers: await authHeaders(admin) },
		);
		expect(asAdmin.status).toBe(200);
		expect(asAdmin.data?.name).toBe("TeamAdmin");
		expect(asAdmin.data?.clubId).toBe(club);

		const asOrganizer = await api.teams.post(
			{ name: "TeamOrg", category: "U15" } as never,
			{ headers: await authHeaders(organizer) },
		);
		expect(asOrganizer.status).toBe(200);
		expect(asOrganizer.data?.clubId).toBeNull();

		const asSuper = await api.teams.post(
			{ name: "TeamSuper", category: "open" } as never,
			{ headers: await authHeaders(superAdmin) },
		);
		expect(asSuper.status).toBe(200);
	});
});

describe("teams - PATCH (admin, organizer)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("PATCH /teams/:id 200 cambia nombre/categoría y desvincula club", async () => {
		const admin = await seedUser({ role: "admin" });
		const team = await seedTeam("OldName");
		const newClub = (
			await db
				.insert(clubs)
				.values({ name: `Club-${Date.now()}` })
				.returning()
		)[0]!;

		const renamed = await api
			.teams({ id: team.id })
			.patch({ name: "NewName" } as never, {
				headers: await authHeaders(admin),
			});
		expect(renamed.status).toBe(200);
		expect(renamed.data?.name).toBe("NewName");

		const withClub = await api
			.teams({ id: team.id })
			.patch({ clubId: newClub.id } as never, {
				headers: await authHeaders(admin),
			});
		expect(withClub.status).toBe(200);
		expect(withClub.data?.clubId).toBe(newClub.id);

		const detached = await api
			.teams({ id: team.id })
			.patch({ clubId: null } as never, { headers: await authHeaders(admin) });
		expect(detached.status).toBe(200);
		expect(detached.data?.clubId).toBeNull();
	});
});

describe("teams - DELETE (solo admin y super_admin)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("DELETE /teams/:id 200 con admin/super_admin, 403 con organizer, 404 después", async () => {
		const admin = await seedUser({ role: "admin" });
		const superAdmin = await seedUser({ role: "super_admin" });
		const organizer = await seedUser({ role: "organizer" });

		const team1 = await seedTeam();
		const delAdmin = await api.teams({ id: team1.id }).delete(undefined, {
			headers: await authHeaders(admin),
		});
		expect(delAdmin.status).toBe(200);
		const afterDelete = await api.teams({ id: team1.id }).get();
		expect(afterDelete.status).toBe(404);

		const team2 = await seedTeam();
		const delSuper = await api.teams({ id: team2.id }).delete(undefined, {
			headers: await authHeaders(superAdmin),
		});
		expect(delSuper.status).toBe(200);

		const team3 = await seedTeam();
		const delForbidden = await api.teams({ id: team3.id }).delete(undefined, {
			headers: await authHeaders(organizer),
		});
		expect(delForbidden.status).toBe(403);
	});
});

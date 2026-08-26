import { afterEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import { resetDb, seedUser, type UserRow } from "./helpers/db";

const api = treaty(app);

// Sanity check de la infraestructura de testing (Fase 0-1):
// preload de env, DB de prueba, reset con drizzle-seed, factories,
// firma de tokens y contrato Eden tipado.
describe("infra", () => {
	let admin: UserRow;

	afterEach(async () => {
		await resetDb();
	});

	it("seed + guard RBAC + envelope de paginación funcionan E2E", async () => {
		admin = await seedUser({ role: "admin" });

		const { data, error, status } = await api.users.get({
			headers: await authHeaders(admin),
		});

		expect(status).toBe(200);
		expect(error).toBeNull();
		if (!data) throw new Error("data should be defined");

		expect(data.items.length).toBeGreaterThanOrEqual(1);
		expect(typeof data.total).toBe("number");
		// El hash de contraseña nunca aparece en la respuesta
		expect(JSON.stringify(data.items)).not.toContain("passwordHash");
		expect(data.items[0]?.email).toBe(admin.email);
	});

	it("sin token la ruta protegida devuelve 401", async () => {
		const { status } = await api.users.get();
		expect(status).toBe(401);
	});
});

import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { users } from "@sports/db/tables";
import { eq } from "drizzle-orm";
import { app } from "../src/app";
import { resetDb, seedUser } from "./helpers/db";

const api = treaty(app);

const PASSWORD = "password123";

async function login(email: string, password: string) {
	return api.auth.login.post({ email, password });
}

describe("auth", () => {
	beforeEach(resetDb);

	it("login válido retorna tokens + usuario sin passwordHash", async () => {
		const user = await seedUser({
			email: "login@test.local",
			password: PASSWORD,
		});

		const { data, error, status } = await login("login@test.local", PASSWORD);

		expect(status).toBe(200);
		expect(error).toBeNull();
		if (!data?.user) throw new Error("no data");

		expect(data.accessToken).toBeString();
		expect(data.refreshToken).toBeString();
		expect(data.user.id).toBe(user.id);
		expect(JSON.stringify(data)).not.toContain("passwordHash");
	});

	it("credenciales inválidas → 401", async () => {
		await seedUser({ email: "wrong@test.local", password: PASSWORD });

		const badPassword = await login("wrong@test.local", "no-es-la-clave");
		expect(badPassword.status).toBe(401);

		const badEmail = await login("nadie@test.local", PASSWORD);
		expect(badEmail.status).toBe(401);
	});

	it("usuario inactivo no puede loguearse", async () => {
		await seedUser({
			email: "inactive@test.local",
			password: PASSWORD,
			isActive: false,
		});

		const { status } = await login("inactive@test.local", PASSWORD);
		expect(status).toBe(401);
	});

	it("refresh válido emite un nuevo par de tokens", async () => {
		await seedUser({ email: "refresh@test.local", password: PASSWORD });
		const login1 = await login("refresh@test.local", PASSWORD);
		if (!login1.data) throw new Error("no data");
		const refreshToken = login1.data?.refreshToken;
		if (!refreshToken) throw new Error("no refresh token");

		const { data, error, status } = await api.auth.refresh.post({
			refreshToken,
		});

		expect(status).toBe(200);
		expect(error).toBeNull();
		expect(data?.accessToken).toBeString();
		// Nota: JWT resuelve iat en segundos; dos emisiones en el mismo
		// segundo producen tokens idénticos, así que solo validamos la forma.
	});

	it("refresh inválido → 401", async () => {
		const { status } = await api.auth.refresh.post({
			refreshToken: "token-basura",
		});
		expect(status).toBe(401);
	});

	it("refresh de usuario eliminado → 401", async () => {
		const user = await seedUser({
			email: "deleted@test.local",
			password: PASSWORD,
		});
		const session = await login(user.email, PASSWORD);
		if (!session.data) throw new Error("no data");
		const refreshToken = session.data?.refreshToken;
		if (!refreshToken) throw new Error("no refresh token");
		await db.delete(users).where(eq(users.id, user.id));

		const { status } = await api.auth.refresh.post({
			refreshToken,
		});
		expect(status).toBe(401);
	});

	it("refresh de usuario inactivo → 403", async () => {
		const user = await seedUser({
			email: "deactivated@test.local",
			password: PASSWORD,
		});
		const session = await login(user.email, PASSWORD);
		if (!session.data) throw new Error("no data");
		const refreshToken = session.data?.refreshToken;
		if (!refreshToken) throw new Error("no refresh token");
		await db
			.update(users)
			.set({ isActive: false })
			.where(eq(users.id, user.id));

		const { status } = await api.auth.refresh.post({
			refreshToken,
		});
		expect(status).toBe(403);
	});

	it("change-password E2E: cambio y re-login con la nueva clave", async () => {
		const user = await seedUser({
			email: "chpass@test.local",
			password: PASSWORD,
		});
		const session = await login(user.email, PASSWORD);
		if (!session.data) throw new Error("no data");

		const change = await api.auth["change-password"].post(
			{ currentPassword: PASSWORD, newPassword: "nuevaClave456" },
			{ headers: { authorization: `Bearer ${session.data.accessToken}` } },
		);
		expect(change.status).toBe(200);

		// La contraseña vieja ya no sirve
		expect((await login(user.email, PASSWORD)).status).toBe(401);
		// La nueva sí
		expect((await login(user.email, "nuevaClave456")).status).toBe(200);
	});

	it("change-password con current incorrecta → 401", async () => {
		const user = await seedUser({
			email: "badcurrent@test.local",
			password: PASSWORD,
		});
		const session = await login(user.email, PASSWORD);
		if (!session.data) throw new Error("no data");

		const { status } = await api.auth["change-password"].post(
			{ currentPassword: "incorrecta", newPassword: "otraClave789" },
			{ headers: { authorization: `Bearer ${session.data.accessToken}` } },
		);
		expect(status).toBe(401);
	});
});

import { describe, expect, it } from "bun:test";
import { app } from "../src/app";

describe("config", () => {
	it("resolvePort acepta puertos válidos", async () => {
		const { resolvePort } = await import("../src/lib/config");
		process.env.PORT = "4123";
		expect(resolvePort()).toBe(4123);
		delete process.env.PORT;
		expect(resolvePort()).toBe(3000);
	});

	it("resolvePort lanza error con puertos inválidos", async () => {
		const { resolvePort } = await import("../src/lib/config");
		for (const invalid of ["99999", "0", "abc", "-1"]) {
			process.env.PORT = invalid;
			expect(() => resolvePort()).toThrow();
		}
		delete process.env.PORT;
	});

	it("resolveCorsOrigins parsea la lista separada por comas", async () => {
		const { resolveCorsOrigins } = await import("../src/lib/config");
		process.env.CORS_ALLOWED_ORIGINS = "https://a.com, https://b.com ,";
		expect(resolveCorsOrigins()).toEqual(["https://a.com", "https://b.com"]);
		delete process.env.CORS_ALLOWED_ORIGINS;
		expect(resolveCorsOrigins()).toBe(true);
	});
});

describe("smoke", () => {
	it("GET / responde sin autenticación", async () => {
		const response = await app.handle(new Request("http://localhost/"));
		expect(response.status).toBe(200);
		expect(await response.text()).toBe("Hello Elysia");
	});

	it("ruta inexistente devuelve 404 con JSON de error", async () => {
		const response = await app.handle(new Request("http://localhost/nope"));
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ message: "Not Found" });
	});
});

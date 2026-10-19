import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { db } from "@sports/db";
import { clubs, tournaments } from "@sports/db/tables";
import { app } from "../src/app";
import {
	resetDb,
	seedPlayer,
	seedSport,
	seedTournament,
	seedVenue,
} from "./helpers/db";

const api = treaty(app);

/**
 * El contrato de ventana de los catálogos: sin limit/offset la lista
 * responde todas las filas; con la ventana, `total` sigue diciendo el
 * universo completo — es lo que un pager necesita para pageCount. El orden
 * natural es por nombre (apellido+nombre en players); `order` lo invierte,
 * `sort` elige columna en donde hay dos naturales, y el id desempata para
 * que dos páginas nunca compartan una fila.
 */
async function seedClubs(count: number) {
	const rows = [];
	for (let i = 0; i < count; i++) {
		const [row] = await db
			.insert(clubs)
			.values({ name: `Club ${String.fromCharCode(90 - i)}` })
			.returning();
		rows.push(row);
	}
	return rows;
}

describe("paginación de catálogos — la ventana la decide el cliente", () => {
	beforeEach(async () => {
		await resetDb();
	});

	it("clubs: sin limit todas las filas; con ventana el total sigue siendo el universo", async () => {
		await seedClubs(3);

		const all = await api.clubs.get({ query: {} });
		expect(all.status).toBe(200);
		if (!all.data) throw new Error("no data");
		expect(all.data.items).toHaveLength(3);
		expect(all.data.total).toBe(3);

		const page = await api.clubs.get({
			query: { limit: 2, offset: 0 } as never,
		});
		expect(page.status).toBe(200);
		if (!page.data) throw new Error("no data");
		expect(page.data.items).toHaveLength(2);
		expect(page.data.total).toBe(3);
		expect(page.data.items.map((c) => c.name)).toEqual(["Club X", "Club Y"]);

		const tail = await api.clubs.get({
			query: { limit: 2, offset: 2 } as never,
		});
		expect(tail.status).toBe(200);
		if (!tail.data) throw new Error("no data");
		expect(tail.data.items.map((c) => c.name)).toEqual(["Club Z"]);
	});

	it("venues: order invierte el nombre; search recorta ilike sin perder el total", async () => {
		await seedVenue({ name: "Arena Norte" });
		await seedVenue({ name: "Arena Sur" });
		await seedVenue({ name: "Estadio Central" });

		const asc = await api.venues.get({ query: { order: "asc" } as never });
		expect(asc.status).toBe(200);
		if (!asc.data) throw new Error("no data");
		expect(asc.data.items.map((v) => v.name)).toEqual([
			"Arena Norte",
			"Arena Sur",
			"Estadio Central",
		]);

		const desc = await api.venues.get({ query: { order: "desc" } as never });
		expect(desc.status).toBe(200);
		if (!desc.data) throw new Error("no data");
		expect(desc.data.items.map((v) => v.name)).toEqual([
			"Estadio Central",
			"Arena Sur",
			"Arena Norte",
		]);

		const arena = await api.venues.get({
			query: { search: "arena", limit: 1 } as never,
		});
		expect(arena.status).toBe(200);
		if (!arena.data) throw new Error("no data");
		expect(arena.data.items).toHaveLength(1);
		expect(arena.data.total).toBe(2);
	});

	it("tournaments: sort=name ordena por nombre aunque createdAt mande al revés", async () => {
		const deporteA = await seedSport();
		const primero = await seedTournament(deporteA.id);
		const deporteB = await seedSport();
		const segundo = await seedTournament(deporteB.id);
		// Nombres deterministas: el natural aleatorio del seed no clasifica.
		await db
			.update(tournaments)
			.set({ name: "Torneo Alfa" })
			.where((await import("drizzle-orm")).eq(tournaments.id, primero.id));
		await db
			.update(tournaments)
			.set({ name: "Torneo Beta" })
			.where((await import("drizzle-orm")).eq(tournaments.id, segundo.id));
		// Primero queda "en el futuro": el orden por recencia lo sube.
		await db
			.update(tournaments)
			.set({ createdAt: new Date("2030-06-01") })
			.where(
				// drizzle eq para el id del primer torneo
				(await import("drizzle-orm")).eq(tournaments.id, primero.id),
			);

		const porRecencia = await api.tournaments.get({ query: {} });
		expect(porRecencia.status).toBe(200);
		if (!porRecencia.data) throw new Error("no data");
		expect(porRecencia.data.items[0]?.id).toBe(primero.id);
		expect(porRecencia.data.items).toHaveLength(2);

		const porNombre = await api.tournaments.get({
			query: { sort: "name", order: "desc" } as never,
		});
		expect(porNombre.status).toBe(200);
		if (!porNombre.data) throw new Error("no data");
		expect(porNombre.data.items.map((t) => t.id)).toEqual([
			segundo.id,
			primero.id,
		]);
	});

	it("players: search pisa apellido y nombre, y pagina con nombre+apellido estable", async () => {
		await seedPlayer({ firstName: "Lucía", lastName: "García" });
		await seedPlayer({ firstName: "García", lastName: "Pérez" });
		await seedPlayer({ firstName: "Ana", lastName: "López" });

		const garcias = await api.players.get({
			query: { search: "garcía" } as never,
		});
		expect(garcias.status).toBe(200);
		if (!garcias.data) throw new Error("no data");
		expect(garcias.data.total).toBe(2);
		expect(garcias.data.items.map((p) => p.lastName)).toEqual([
			"García",
			"Pérez",
		]);

		const ventana = await api.players.get({
			query: { limit: 1, offset: 1 } as never,
		});
		expect(ventana.status).toBe(200);
		if (!ventana.data) throw new Error("no data");
		expect(ventana.data.items).toHaveLength(1);
		expect(ventana.data.total).toBe(3);
	});
});

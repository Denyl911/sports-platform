import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import type { UserRow } from "./helpers/db";
import {
	resetDb,
	seedEdition,
	seedGroup,
	seedMember,
	seedRegistration,
	seedStage,
	seedTeam,
	seedTournament,
	seedUser,
} from "./helpers/db";

const api = treaty(app);

function h(user: UserRow) {
	return authHeaders(user);
}

describe("grupos - creación automática", () => {
	let organizer: UserRow;
	let stageId: string;

	beforeEach(async () => {
		await resetDb();
		organizer = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		stageId = stage.id;
		await seedMember(tournament.id, organizer.id, "organizer");
	});

	it("crea A y B y reparte a todos los inscritos una sola vez", async () => {
		const teams = await Promise.all(
			Array.from({ length: 5 }, (_, i) => seedTeam(`Equipo ${i}`)),
		);
		for (const team of teams) await seedRegistration(stageId, team.id);

		const res = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({ numGroups: 2 }, { headers: await h(organizer) });
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("no data");
		expect(res.data.created).toBe(2);
		expect(res.data.assigned).toBe(5);
		expect(res.data.groups.map((g) => g.name)).toEqual(["A", "B"]);

		const regs = await api.stages({ stageId }).registrations.get();
		expect(regs.status).toBe(200);
		if (!regs.data) throw new Error("no data");
		expect(regs.data.items).toHaveLength(5);
		expect(
			regs.data.items.every((item) => item.registration.groupId !== null),
		).toBe(true);

		const sizes = new Map<string, number>();
		for (const item of regs.data.items) {
			const groupId = item.registration.groupId!;
			sizes.set(groupId, (sizes.get(groupId) ?? 0) + 1);
		}
		expect(sizes.size).toBe(2);
		expect([...sizes.values()].sort()).toEqual([2, 3]);
	});

	it("con grupos ya creados solo completa los equipos sin grupo", async () => {
		const north = (
			await api.tournaments
				.stages({ stageId })
				.groups.post({ name: "Norte" } as never, {
					headers: await h(organizer),
				})
		).data;
		if (!north) throw new Error("no north group");
		await api.tournaments
			.stages({ stageId })
			.groups.post({ name: "Sur" } as never, {
				headers: await h(organizer),
			});

		const fixed = await seedTeam("Fijo");
		const freeA = await seedTeam("Libre A");
		const freeB = await seedTeam("Libre B");
		await seedRegistration(stageId, fixed.id, north.id);
		await seedRegistration(stageId, freeA.id);
		await seedRegistration(stageId, freeB.id);

		const res = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({}, { headers: await h(organizer) });
		expect(res.status).toBe(200);
		if (!res.data) throw new Error("no data");
		expect(res.data.created).toBe(0);
		expect(res.data.assigned).toBe(2);
		expect(res.data.groups.map((g) => g.name)).toEqual(["Norte", "Sur"]);

		const regs = await api.stages({ stageId }).registrations.get();
		if (!regs.data) throw new Error("no data");
		const fixedRow = regs.data.items.find((item) => item.team.id === fixed.id);
		expect(fixedRow?.registration.groupId).toBe(north.id);
		const freeRows = regs.data.items.filter((item) =>
			[freeA.id, freeB.id].includes(item.team.id),
		);
		expect(freeRows.every((item) => item.registration.groupId !== null)).toBe(
			true,
		);
	});

	it("sin grupos exige la cantidad y alcanza con los equipos inscritos", async () => {
		const missing = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({}, { headers: await h(organizer) });
		expect(missing.status).toBe(400);

		const onlyTeam = await seedTeam();
		await seedRegistration(stageId, onlyTeam.id);
		const notEnough = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({ numGroups: 2 }, { headers: await h(organizer) });
		expect(notEnough.status).toBe(400);
	});

	it("rechaza cantidades fuera del rango 2–26", async () => {
		const low = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({ numGroups: 1 }, { headers: await h(organizer) });
		expect(low.status).toBe(400);

		const high = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({ numGroups: 27 }, { headers: await h(organizer) });
		expect(high.status).toBe(400);
	});

	it("sin ser organizador responde 403 y sin token 401", async () => {
		const viewer = await seedUser({ role: "viewer_staff" });
		const forbidden = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({ numGroups: 2 }, { headers: await h(viewer) });
		expect(forbidden.status).toBe(403);

		const unauth = await api.tournaments
			.stages({ stageId })
			.groups.auto.post({ numGroups: 2 });
		expect(unauth.status).toBe(401);
	});
});

describe("grupos - orden de las filas", () => {
	let organizer: UserRow;
	let stageId: string;

	beforeEach(async () => {
		await resetDb();
		organizer = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		stageId = stage.id;
		await seedMember(tournament.id, organizer.id, "organizer");
	});

	it("mover dentro del grupo reordena y renumera 0..n-1", async () => {
		const group = await seedGroup(stageId);
		const alpha = await seedTeam("Alpha");
		const bravo = await seedTeam("Bravo");
		const charlie = await seedTeam("Charlie");
		await seedRegistration(stageId, alpha.id, group.id);
		await seedRegistration(stageId, bravo.id, group.id);
		const regCharlie = await seedRegistration(stageId, charlie.id, group.id);

		const moved = await api
			.registrations({ id: regCharlie.id })
			.group.patch(
				{ groupId: group.id, position: 0 },
				{ headers: await h(organizer) },
			);
		expect(moved.status).toBe(200);
		expect(moved.data?.position).toBe(0);

		const list = await api.registrations.groups({ groupId: group.id }).get();
		if (!list.data) throw new Error("no data");
		expect(list.data.items.map((item) => item.team.name)).toEqual([
			"Charlie",
			"Alpha",
			"Bravo",
		]);
		expect(list.data.items.map((item) => item.registration.position)).toEqual([
			0, 1, 2,
		]);
		expect(list.data.total).toBe(3);
	});

	it("mover a otro grupo agrega al final y cierra el hueco del origen", async () => {
		const north = await seedGroup(stageId);
		const south = await seedGroup(stageId);
		const northOne = await seedTeam("Norte 1");
		const northTwo = await seedTeam("Norte 2");
		const southOne = await seedTeam("Sur 1");
		const regNorthOne = await seedRegistration(stageId, northOne.id, north.id);
		await seedRegistration(stageId, northTwo.id, north.id);
		await seedRegistration(stageId, southOne.id, south.id);

		const moved = await api
			.registrations({ id: regNorthOne.id })
			.group.patch({ groupId: south.id }, { headers: await h(organizer) });
		expect(moved.status).toBe(200);
		expect(moved.data?.groupId).toBe(south.id);

		const southList = await api.registrations
			.groups({ groupId: south.id })
			.get();
		if (!southList.data) throw new Error("no data");
		expect(southList.data.items.map((item) => item.team.name)).toEqual([
			"Sur 1",
			"Norte 1",
		]);
		expect(
			southList.data.items.map((item) => item.registration.position),
		).toEqual([0, 1]);

		const northList = await api.registrations
			.groups({ groupId: north.id })
			.get();
		if (!northList.data) throw new Error("no data");
		expect(northList.data.items.map((item) => item.team.name)).toEqual([
			"Norte 2",
		]);
		expect(northList.data.items[0]?.registration.position).toBe(0);
	});

	it("una posición mayor al tamaño del grupo cae al final", async () => {
		const group = await seedGroup(stageId);
		const alpha = await seedTeam("Alpha");
		const bravo = await seedTeam("Bravo");
		const regAlpha = await seedRegistration(stageId, alpha.id, group.id);
		await seedRegistration(stageId, bravo.id, group.id);

		const moved = await api
			.registrations({ id: regAlpha.id })
			.group.patch(
				{ groupId: group.id, position: 99 },
				{ headers: await h(organizer) },
			);
		expect(moved.status).toBe(200);
		expect(moved.data?.position).toBe(1);

		const list = await api.registrations.groups({ groupId: group.id }).get();
		if (!list.data) throw new Error("no data");
		expect(list.data.items.map((item) => item.team.name)).toEqual([
			"Bravo",
			"Alpha",
		]);
	});

	it("reordenar sin groupId conserva el grupo actual", async () => {
		const group = await seedGroup(stageId);
		const team = await seedTeam();
		const registration = await seedRegistration(stageId, team.id, group.id);

		const moved = await api
			.registrations({ id: registration.id })
			.group.patch({ position: 0 }, { headers: await h(organizer) });
		expect(moved.status).toBe(200);
		expect(moved.data?.groupId).toBe(group.id);
	});
});

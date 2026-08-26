import { Elysia, t } from "elysia";
import {
	addPlayerToRosterSchema,
	rosterCollectionParamsSchema,
	rosterEntryIdParamsSchema,
	updateTournamentRosterSchema,
} from "@sports/schemas";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireEditionRole } from "../middlewares/role.guard";
import {
	addPlayerToRoster,
	findRosterEntryById,
	listRoster,
	removePlayerFromRoster,
	updateRosterEntry,
} from "../services/roster.service";

// Resuelve el editionId desde la fila de roster y delega al guard de edición
function requireRosterRole(
	...roles: Parameters<typeof requireEditionRole>
): (ctx: unknown) => Promise<void> {
	const inner = requireEditionRole(...roles);
	return async (ctx: unknown) => {
		const params = (ctx as { params?: Record<string, string> })?.params;
		if (params?.id) {
			const entry = await findRosterEntryById(params.id);
			params.editionId = entry.editionId;
		}
		await inner(ctx);
	};
}

export const rostersRoutes = new Elysia({
	prefix: "/editions/:editionId/teams/:teamId/roster",
	tags: ["Rosters"],
})
	.use(jwtMiddleware)
	// Lectura pública
	.get("/", async ({ params }) => listRoster(params.editionId, params.teamId), {
		params: rosterCollectionParamsSchema,
	})
	.post(
		"/",
		async ({ params, body }) =>
			addPlayerToRoster({
				...body,
				editionId: params.editionId,
				teamId: params.teamId,
			}),
		{
			auth: true,
			params: rosterCollectionParamsSchema,
			body: t.Omit(addPlayerToRosterSchema, ["editionId", "teamId"]),
			beforeHandle: requireEditionRole("organizer"),
			detail: { summary: "Añadir jugador al plantel" },
		},
	);

export const rosterItemRoutes = new Elysia({
	prefix: "/rosters",
	tags: ["Rosters"],
})
	.use(jwtMiddleware)
	.patch(
		"/:id",
		async ({ params, body }) => updateRosterEntry(params.id, body),
		{
			auth: true,
			params: rosterEntryIdParamsSchema,
			body: updateTournamentRosterSchema,
			beforeHandle: requireRosterRole("organizer"),
			detail: { summary: "Actualizar entrada del plantel" },
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			await removePlayerFromRoster(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: rosterEntryIdParamsSchema,
			beforeHandle: requireRosterRole("organizer"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Quitar jugador del plantel" },
		},
	);

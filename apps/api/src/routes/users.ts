import { Elysia, t } from "elysia";
import {
	addTournamentMemberSchema,
	tournamentMemberRefParamsSchema,
	updateTournamentMemberRoleSchema,
	updateUserSchema,
	userCreateSchema,
	userFilterQuerySchema,
	userRefParamsSchema,
} from "@sports/schemas";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	addTournamentMember,
	createUser,
	deleteUser,
	findUserById,
	listUsers,
	removeTournamentMember,
	updateTournamentMemberRole,
	updateUser,
} from "../services/user.service";

export const usersRoutes = new Elysia({ prefix: "/users", tags: ["Users"] })
	.use(jwtMiddleware)
	// Todo el módulo de usuarios requiere administración global
	.get("/", async ({ query }) => listUsers(query), {
		auth: true,
		query: userFilterQuerySchema,
		beforeHandle: requireGlobalRole("admin"),
	})
	.get("/:userId", async ({ params }) => findUserById(params.userId), {
		auth: true,
		params: userRefParamsSchema,
		beforeHandle: requireGlobalRole("admin"),
	})
	.post("/", async ({ body }) => createUser(body), {
		auth: true,
		body: userCreateSchema,
		beforeHandle: requireGlobalRole("admin"),
		detail: { summary: "Crear usuario (hash local con Bun.password)" },
	})
	.patch(
		"/:userId",
		async ({ params, body }) => updateUser(params.userId, body),
		{
			auth: true,
			params: userRefParamsSchema,
			body: updateUserSchema,
			beforeHandle: requireGlobalRole("admin"),
			detail: { summary: "Actualizar usuario" },
		},
	)
	.delete(
		"/:userId",
		async ({ params }) => {
			await deleteUser(params.userId);
			return { success: true };
		},
		{
			auth: true,
			params: userRefParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar usuario" },
		},
	)
	// ==========================================
	// Membresías RBAC por torneo
	// ==========================================
	.post(
		"/:userId/memberships",
		async ({ params, body }) =>
			addTournamentMember({ ...body, userId: params.userId }),
		{
			auth: true,
			params: userRefParamsSchema,
			body: t.Omit(addTournamentMemberSchema, ["userId"]),
			beforeHandle: requireGlobalRole("admin", "organizer"),
			detail: { summary: "Asignar rol de usuario en un torneo" },
		},
	);

export const membershipItemRoutes = new Elysia({
	prefix: "/memberships",
	tags: ["Memberships"],
})
	.use(jwtMiddleware)
	.patch(
		"/:memberId",
		async ({ params, body }) =>
			updateTournamentMemberRole(params.memberId, body.role ?? ""),
		{
			auth: true,
			params: tournamentMemberRefParamsSchema,
			body: updateTournamentMemberRoleSchema,
			beforeHandle: requireGlobalRole("admin", "organizer"),
			detail: { summary: "Cambiar rol de la membresía" },
		},
	)
	.delete(
		"/:memberId",
		async ({ params }) => {
			await removeTournamentMember(params.memberId);
			return { success: true };
		},
		{
			auth: true,
			params: tournamentMemberRefParamsSchema,
			beforeHandle: requireGlobalRole("admin", "organizer"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Quitar membresía" },
		},
	);

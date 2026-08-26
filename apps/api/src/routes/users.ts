// @ts-nocheck

import {
	addTournamentMemberSchema,
	selectTournamentMemberSchema,
	tournamentMemberRefParamsSchema,
	updateTournamentMemberRoleSchema,
	updateUserSchema,
	userCreateSchema,
	userFilterQuerySchema,
	userPublicSchema,
	userRefParamsSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import {
	requireGlobalRole,
	requireMembershipRole,
	requireTournamentRole,
} from "../middlewares/role.guard";
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
	.get("/", async ({ query }) => listUsers(query), {
		auth: true,
		query: userFilterQuerySchema,
		response: {
			200: t.Object({ items: t.Array(userPublicSchema), total: t.Integer() }),
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Listar usuarios",
			description:
				"Requiere rol global `admin`. Filtros: `role`, `isActive`. Paginado `limit`/`offset`. Retorna usuarios sin `passwordHash`.",
			tags: ["Users"],
		},
	})
	.get("/:userId", async ({ params }) => findUserById(params.userId), {
		auth: true,
		params: userRefParamsSchema,
		response: {
			200: userPublicSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Obtener usuario por ID",
			description: "Requiere `admin` global. Retorna usuario público sin hash.",
			tags: ["Users"],
		},
	})
	.post("/", async ({ body }) => createUser(body), {
		auth: true,
		body: userCreateSchema,
		response: {
			200: userPublicSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			409: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Crear usuario",
			description:
				"Requiere `admin` global. Hashea la contraseña con `Bun.password`. 409 si el email ya existe.",
			tags: ["Users"],
		},
	})
	.patch(
		"/:userId",
		async ({ params, body }) => updateUser(params.userId, body),
		{
			auth: true,
			params: userRefParamsSchema,
			body: updateUserSchema,
			response: {
				200: userPublicSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireGlobalRole("admin"),
			detail: {
				summary: "Actualizar usuario",
				description:
					"Requiere `admin` global. No permite actualizar `passwordHash` directo (usar `POST /auth/change-password`).",
				tags: ["Users"],
			},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar usuario",
				description:
					"Requiere `admin` global. 409 si tiene membresías referenciadas (FK).",
				tags: ["Users"],
			},
		},
	)
	.post(
		"/:userId/memberships",
		async ({ params, body }) =>
			addTournamentMember({ ...body, userId: params.userId }),
		{
			auth: true,
			params: userRefParamsSchema,
			body: t.Omit(addTournamentMemberSchema, ["userId"]),
			response: {
				200: selectTournamentMemberSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireTournamentRole("organizer"),
			detail: {
				summary: "Asignar rol de usuario en un torneo",
				description:
					"Requiere `organizer` en el torneo del body. 409 si ya es miembro. Roles válidos: `organizer`, `referee`, `statistician`, `viewer_staff`.",
				tags: ["Users"],
			},
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
			response: {
				200: selectTournamentMemberSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireMembershipRole("organizer"),
			detail: {
				summary: "Cambiar rol de la membresía",
				description:
					"Requiere `organizer` del torneo de la membresía. Valida rol dentro del enum permitido para torneos.",
				tags: ["Memberships"],
			},
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
			beforeHandle: requireMembershipRole("organizer"),
			response: {
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Quitar membresía",
				description: "Requiere `organizer` del torneo de la membresía.",
				tags: ["Memberships"],
			},
		},
	);

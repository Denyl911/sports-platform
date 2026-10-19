import {
	createInvitationSchema,
	invitationInfoSchema,
	invitationResponseSchema,
	invitationTokenParamsSchema,
	registerWithInvitationSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	createInvitation,
	deactivateInvitation,
	getInvitationInfo,
	listInvitationsByStage,
	registerTeamWithInvitation,
} from "../services/invitation.service";

export const invitationRoutes = new Elysia({
	prefix: "/invitations",
	tags: ["Invitations"],
})
	.use(jwtMiddleware)
	.get("/:token", async ({ params }) => getInvitationInfo(params.token), {
		params: invitationTokenParamsSchema,
		response: {
			200: invitationInfoSchema,
			400: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Obtener información de invitación",
			description:
				"Endpoint público. Valida el token y retorna información del torneo/etapa para mostrar en la página de invitación.",
			tags: ["Invitations"],
		},
	})
	.post(
		"/:token/register",
		async ({ params, body }) => registerTeamWithInvitation(params.token, body),
		{
			params: invitationTokenParamsSchema,
			body: registerWithInvitationSchema,
			response: {
				200: successSchema,
				400: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Inscribir equipo con invitación",
				description:
					"Endpoint público. Inscribe un equipo en la etapa usando un token de invitación válido. Permite crear un equipo nuevo o usar uno existente.",
				tags: ["Invitations"],
			},
		},
	)
	.post(
		"/",
		async ({ body, userId }) => {
			const invitation = await createInvitation(body.stageId, userId, body);
			return invitation;
		},
		{
			auth: true,
			body: createInvitationSchema,
			beforeHandle: requireGlobalRole("admin", "organizer"),
			response: {
				200: invitationResponseSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Crear invitación de inscripción",
				description:
					"Requiere rol global `admin` u `organizer`. Crea un token de invitación para que los capitanes inscriban equipos en una etapa específica.",
				tags: ["Invitations"],
			},
		},
	)
	.get(
		"/stage/:stageId",
		async ({ params }) => {
			const result = await listInvitationsByStage(params.stageId);
			return {
				items: result.items.map((item) => ({
					id: item.id,
					stageId: item.stageId,
					token: item.token,
					expiresAt: item.expiresAt.toISOString(),
					maxUses: item.maxUses ?? 1,
					usesCount: item.usesCount,
					isActive: item.isActive,
					createdAt: item.createdAt.toISOString(),
				})),
				total: result.total,
			};
		},
		{
			auth: true,
			beforeHandle: requireGlobalRole("admin", "organizer"),
			response: {
				200: t.Object({
					items: t.Array(invitationResponseSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
			},
			detail: {
				summary: "Listar invitaciones de una etapa",
				description:
					"Requiere rol global `admin` u `organizer`. Lista todas las invitaciones creadas para una etapa específica.",
				tags: ["Invitations"],
			},
		},
	)
	.delete("/:token", async ({ params }) => deactivateInvitation(params.token), {
		auth: true,
		beforeHandle: requireGlobalRole("admin", "organizer"),
		response: {
			200: successSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Desactivar invitación",
			description:
				"Requiere rol global `admin` u `organizer`. Desactiva un token de invitación para que no pueda ser usado.",
			tags: ["Invitations"],
		},
	});

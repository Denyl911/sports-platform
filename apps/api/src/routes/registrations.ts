import { Elysia, t } from "elysia";
import {
	groupRefParamsSchema,
	registerTeamInStageSchema,
	registrationGroupUpdateSchema,
	registrationIdParamsSchema,
	stageRefParamsSchema,
} from "@sports/schemas";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import {
	requireRegistrationRole,
	requireStageRole,
} from "../middlewares/role.guard";
import {
	listRegistrationsByGroup,
	listRegistrationsByStage,
	registerTeamInStage,
	unregisterTeam,
	updateRegistrationGroup,
} from "../services/registration.service";

export const stageRegistrationsRoutes = new Elysia({
	prefix: "/stages",
	tags: ["Registrations"],
})
	.use(jwtMiddleware)
	// Lectura pública
	.get(
		"/:stageId/registrations",
		async ({ params }) => listRegistrationsByStage(params.stageId),
		{ params: stageRefParamsSchema },
	)
	.post(
		"/:stageId/registrations",
		async ({ params, body }) =>
			registerTeamInStage({ ...body, stageId: params.stageId }),
		{
			auth: true,
			params: stageRefParamsSchema,
			body: t.Omit(registerTeamInStageSchema, ["stageId"]),
			beforeHandle: requireStageRole("organizer"),
			detail: { summary: "Inscribir equipo en la etapa" },
		},
	);

export const registrationItemRoutes = new Elysia({
	prefix: "/registrations",
	tags: ["Registrations"],
})
	.use(jwtMiddleware)
	.get(
		"/groups/:groupId",
		async ({ params }) => listRegistrationsByGroup(params.groupId),
		{ params: groupRefParamsSchema },
	)
	.patch(
		"/:id/group",
		async ({ params, body }) =>
			updateRegistrationGroup(params.id, body.groupId ?? undefined),
		{
			auth: true,
			params: registrationIdParamsSchema,
			body: registrationGroupUpdateSchema,
			beforeHandle: requireRegistrationRole("organizer"),
			detail: { summary: "Asignar/quitar grupo de la inscripción" },
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			await unregisterTeam(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: registrationIdParamsSchema,
			beforeHandle: requireRegistrationRole("organizer"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Quitar inscripción" },
		},
	);

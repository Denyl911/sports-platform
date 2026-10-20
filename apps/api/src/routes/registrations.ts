// @ts-nocheck

import {
	groupRefParamsSchema,
	registerTeamInStageSchema,
	registrationGroupUpdateSchema,
	registrationIdParamsSchema,
	selectStageTeamRegistrationSchema,
	selectTeamSchema,
	stageRefParamsSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
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

const registrationWithTeamSchema = t.Object({
	registration: selectStageTeamRegistrationSchema,
	team: selectTeamSchema,
});

export const stageRegistrationsRoutes = new Elysia({
	prefix: "/stages",
	tags: ["Registrations"],
})
	.use(jwtMiddleware)
	.get(
		"/:stageId/registrations",
		async ({ params }) => listRegistrationsByStage(params.stageId),
		{
			params: stageRefParamsSchema,
			response: {
				200: t.Object({
					items: t.Array(registrationWithTeamSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Listar inscripciones de la etapa",
				description:
					"Lectura pública. Retorna `{ items: { registration, team }[], total }` ordenadas por `seedNumber` y nombre del equipo.",
				tags: ["Registrations"],
			},
		},
	)
	.post(
		"/:stageId/registrations",
		async ({ params, body }) =>
			registerTeamInStage({ ...body, stageId: params.stageId }),
		{
			auth: true,
			params: stageRefParamsSchema,
			body: t.Omit(registerTeamInStageSchema, ["stageId"]),
			response: {
				200: selectStageTeamRegistrationSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireStageRole("organizer"),
			detail: {
				summary: "Inscribir equipo en la etapa",
				description:
					"Requiere `organizer` de la etapa. 409 si el equipo ya está inscrito. Si se asigna `groupId`, debe pertenecer a la misma etapa.",
				tags: ["Registrations"],
			},
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
		{
			params: groupRefParamsSchema,
			response: {
				200: t.Object({
					items: t.Array(registrationWithTeamSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Listar inscripciones por grupo",
				description:
					"Lectura pública. Filtra por `groupId` asignado. Retorna `{ items, total }`.",
				tags: ["Registrations"],
			},
		},
	)
	.patch(
		"/:id/group",
		async ({ params, body }) =>
			updateRegistrationGroup(params.id, {
				groupId: body.groupId,
				position: body.position,
			}),
		{
			auth: true,
			params: registrationIdParamsSchema,
			body: registrationGroupUpdateSchema,
			response: {
				200: selectStageTeamRegistrationSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireRegistrationRole("organizer"),
			detail: {
				summary: "Asignar grupo y posición a la inscripción",
				description:
					"Requiere `organizer` de la inscripción. Si se asigna `groupId`, debe pertenecer a la misma etapa. `null` quita el grupo. `position` es el índice 0-based dentro del grupo: se inserta ahí y se renumeran las demás filas; sin `position` se agrega al final.",
				tags: ["Registrations"],
			},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Quitar inscripción",
				description:
					"Requiere `organizer` de la inscripción. 409 si tiene dependencias.",
				tags: ["Registrations"],
			},
		},
	);

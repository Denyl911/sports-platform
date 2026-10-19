import { type Static, t } from "elysia";

/**
 * Schemas TypeBox para invitaciones de inscripción de equipos.
 * Derivados de la tabla stage_invitation_tokens (ADR 001).
 */

export const invitationTokenParamsSchema = t.Object({
	token: t.String({ minLength: 1, maxLength: 64 }),
});

export const createInvitationSchema = t.Object({
	stageId: t.String({ format: "uuid" }),
	expiresAt: t.Optional(t.String({ format: "date-time" })),
	maxUses: t.Optional(t.Union([t.Integer({ minimum: 1 }), t.Null()])),
});

export const invitationResponseSchema = t.Object({
	id: t.String({ format: "uuid" }),
	stageId: t.String({ format: "uuid" }),
	token: t.String(),
	expiresAt: t.String({ format: "date-time" }),
	maxUses: t.Integer(),
	usesCount: t.Integer(),
	isActive: t.Boolean(),
	createdAt: t.String({ format: "date-time" }),
});

export const invitationInfoSchema = t.Object({
	stageId: t.String({ format: "uuid" }),
	stageName: t.String(),
	editionName: t.String(),
	tournamentName: t.String(),
	tournamentId: t.String({ format: "uuid" }),
	editionId: t.String({ format: "uuid" }),
});

export const registerWithInvitationSchema = t.Object({
	teamId: t.Optional(t.String({ format: "uuid" })),
	newTeam: t.Optional(
		t.Object({
			name: t.String({ minLength: 1, maxLength: 100 }),
			clubId: t.Optional(t.String({ format: "uuid" })),
		}),
	),
});

// ==========================================
// TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type CreateInvitation = Static<typeof createInvitationSchema>;
export type InvitationResponse = Static<typeof invitationResponseSchema>;
export type InvitationInfo = Static<typeof invitationInfoSchema>;
export type RegisterWithInvitation = Static<
	typeof registerWithInvitationSchema
>;

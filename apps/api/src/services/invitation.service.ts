import { db } from "@sports/db";
import {
	stageInvitationTokens,
	tournamentEditions,
	tournamentStages,
	tournaments,
	stageTeamRegistrations,
	teams,
	clubs,
} from "@sports/db/tables";
import type {
	CreateInvitation,
	InvitationResponse,
	InvitationInfo,
	RegisterWithInvitation,
} from "@sports/schemas";
import { and, asc, eq, sql } from "drizzle-orm";
import { DomainError } from "./errors";

// ==========================================
// Invitaciones de inscripción
// ==========================================

function generateToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

export async function createInvitation(
	stageId: string,
	createdBy: string,
	data: CreateInvitation,
): Promise<InvitationResponse> {
	const [stage] = await db
		.select({ id: tournamentStages.id })
		.from(tournamentStages)
		.where(eq(tournamentStages.id, stageId))
		.limit(1);

	if (!stage) throw DomainError.notFound(`Stage '${stageId}' not found`);

	const token = generateToken();
	const expiresAt = data.expiresAt
		? new Date(data.expiresAt)
		: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días por defecto

	const [created] = await db
		.insert(stageInvitationTokens)
		.values({
			stageId,
			token,
			createdBy,
			expiresAt,
			maxUses: data.maxUses ?? 1,
		})
		.returning();

	return {
		id: created.id,
		stageId: created.stageId,
		token: created.token,
		expiresAt: created.expiresAt.toISOString(),
		maxUses: created.maxUses ?? 1,
		usesCount: created.usesCount,
		isActive: created.isActive,
		createdAt: created.createdAt.toISOString(),
	};
}

export async function findInvitationByToken(
	token: string,
): Promise<InvitationResponse | null> {
	const [invitation] = await db
		.select()
		.from(stageInvitationTokens)
		.where(eq(stageInvitationTokens.token, token))
		.limit(1);

	if (!invitation) return null;

	return {
		id: invitation.id,
		stageId: invitation.stageId,
		token: invitation.token,
		expiresAt: invitation.expiresAt.toISOString(),
		maxUses: invitation.maxUses ?? 1,
		usesCount: invitation.usesCount,
		isActive: invitation.isActive,
		createdAt: invitation.createdAt.toISOString(),
	};
}

export async function getInvitationInfo(
	token: string,
): Promise<InvitationInfo> {
	const [result] = await db
		.select({
			stageId: tournamentStages.id,
			stageName: tournamentStages.name,
			editionName: tournamentEditions.name,
			tournamentName: tournaments.name,
			tournamentId: tournaments.id,
			editionId: tournamentEditions.id,
		})
		.from(stageInvitationTokens)
		.innerJoin(
			tournamentStages,
			eq(stageInvitationTokens.stageId, tournamentStages.id),
		)
		.innerJoin(
			tournamentEditions,
			eq(tournamentStages.editionId, tournamentEditions.id),
		)
		.innerJoin(tournaments, eq(tournamentEditions.tournamentId, tournaments.id))
		.where(eq(stageInvitationTokens.token, token))
		.limit(1);

	if (!result) throw DomainError.notFound("Invitation not found");
	return result as InvitationInfo;
}

export async function registerTeamWithInvitation(
	token: string,
	data: RegisterWithInvitation,
): Promise<{ success: true }> {
	const invitation = await findInvitationByToken(token);

	if (!invitation) throw DomainError.notFound("Invalid invitation token");
	if (!invitation.isActive)
		throw DomainError.forbidden("Invitation is no longer active");
	if (new Date() > new Date(invitation.expiresAt))
		throw DomainError.forbidden("Invitation has expired");
	if (invitation.maxUses !== null && invitation.usesCount >= invitation.maxUses)
		throw DomainError.forbidden("Invitation has reached its usage limit");

	// Resolver o crear equipo
	let teamId = data.teamId;

	if (data.newTeam) {
		const [club] = data.newTeam.clubId
			? await db
					.select({ id: clubs.id })
					.from(clubs)
					.where(eq(clubs.id, data.newTeam.clubId))
					.limit(1)
			: [{ id: null }];

		const [newTeam] = await db
			.insert(teams)
			.values({
				name: data.newTeam.name,
				clubId: club?.id ?? null,
			})
			.returning({ id: teams.id });

		teamId = newTeam.id;
	} else if (!teamId) {
		throw DomainError.badRequest("Either teamId or newTeam is required");
	}

	// Verificar que el equipo existe
	const [team] = await db
		.select({ id: teams.id })
		.from(teams)
		.where(eq(teams.id, teamId))
		.limit(1);

	if (!team) throw DomainError.notFound(`Team '${teamId}' not found`);

	// Verificar que no esté ya inscrito
	const [existingReg] = await db
		.select({ id: stageTeamRegistrations.id })
		.from(stageTeamRegistrations)
		.where(
			and(
				eq(stageTeamRegistrations.stageId, invitation.stageId),
				eq(stageTeamRegistrations.teamId, teamId),
			),
		)
		.limit(1);

	if (existingReg)
		throw DomainError.conflict("Team is already registered in this stage");

	// Inscribir equipo
	await db.insert(stageTeamRegistrations).values({
		stageId: invitation.stageId,
		teamId,
	});

	// Incrementar contador de usos
	await db
		.update(stageInvitationTokens)
		.set({ usesCount: sql`${stageInvitationTokens.usesCount} + 1` })
		.where(eq(stageInvitationTokens.id, invitation.id));

	return { success: true };
}

export async function listInvitationsByStage(stageId: string) {
	const items = await db
		.select()
		.from(stageInvitationTokens)
		.where(eq(stageInvitationTokens.stageId, stageId))
		.orderBy(asc(stageInvitationTokens.createdAt));

	return { items, total: items.length };
}

export async function deactivateInvitation(token: string) {
	const result = await db
		.update(stageInvitationTokens)
		.set({ isActive: false })
		.where(eq(stageInvitationTokens.token, token))
		.returning({ id: stageInvitationTokens.id });

	if (!result.length) throw DomainError.notFound("Invitation not found");
	return { success: true };
}

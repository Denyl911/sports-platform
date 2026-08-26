import { DomainError } from "../services/errors";
import { findRosterEntryById } from "../services/roster.service";
import {
	getEditionTournamentId,
	getGroupTournamentId,
	getMatchTournamentId,
	getMembershipTournamentId,
	getRegistrationTournamentId,
	getStageTournamentId,
	getStandingRowTournamentId,
} from "../services/scoped-ids.service";
import { findTournamentMembership } from "../services/user.service";

// Roles globales de plataforma que pueden exigirse por completo
type GlobalRole = "super_admin" | "admin" | "organizer";
type TournamentScopedRole =
	| "organizer"
	| "referee"
	| "statistician"
	| "viewer_staff";

/**
 * Contexto mínimo que el macro `auth` de jwtMiddleware inyecta en el request.
 * Los guards lo reciben tipado desde beforeHandle (sin `unknown`).
 */
export interface AuthedContext {
	userId?: string;
	userRole?: string;
	user?: { role?: string | null };
	params?: Record<string, string>;
	body?: unknown;
}

type ParsedContext = AuthedContext & { userId: string; userRole: string };

function parseAuthContext(ctx?: AuthedContext | null): ParsedContext {
	if (!ctx?.userId || !ctx.userRole) {
		throw DomainError.unauthorized("Authentication required");
	}
	return ctx as ParsedContext;
}

// Resuelve el torneo relevante para la petición a partir del contexto tipado
type RoleResolver = (ctx: ParsedContext) => Promise<string>;

function tournamentScoped(
	resolveTournamentId: RoleResolver,
	roles: TournamentScopedRole[],
) {
	return async (rawCtx?: AuthedContext | null) => {
		const ctx = parseAuthContext(rawCtx);
		if (isGlobalAdmin(ctx)) return;

		const tournamentId = await resolveTournamentId(ctx);
		await assertTournamentAccess(tournamentId, ctx.userId, roles);
	};
}

// Resolver que toma un id desde :paramKey y lo traduce a tournamentId
function fromParam(
	key: string,
	lookup: (id: string) => Promise<string>,
): RoleResolver {
	return async (ctx) => {
		const id = ctx.params?.[key];
		if (!id) {
			throw DomainError.badRequest(`A ${key} is required for this action`);
		}
		return lookup(id);
	};
}

// Exige uno de los roles globales de la plataforma
export function requireGlobalRole(...roles: GlobalRole[]) {
	return async (rawCtx?: AuthedContext | null) => {
		const ctx = parseAuthContext(rawCtx);
		if (!roles.includes(ctx.userRole as GlobalRole)) {
			throw DomainError.forbidden(
				`This action requires one of: ${roles.join(", ")}`,
			);
		}
	};
}

// Exige una membresía con uno de los roles indicados en el torneo
// (el torneo se resuelve desde params.tournamentId o body.tournamentId)
export function requireTournamentRole(...roles: TournamentScopedRole[]) {
	return tournamentScoped(async (ctx) => {
		const fromParams = ctx.params?.tournamentId;
		if (fromParams) return fromParams;

		if (ctx.body && typeof ctx.body === "object") {
			const value = (ctx.body as Record<string, unknown>).tournamentId;
			if (typeof value === "string") return value;
		}
		throw DomainError.badRequest("A tournamentId is required for this action");
	}, roles);
}

// Resuelve el torneo desde :id del partido
export const requireMatchRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("id", getMatchTournamentId), roles);

// Resuelve el torneo desde :editionId
export const requireEditionRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("editionId", getEditionTournamentId), roles);

// Resuelve el torneo desde :stageId
export const requireStageRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("stageId", getStageTournamentId), roles);

// Resuelve el torneo desde :groupId
export const requireGroupRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("groupId", getGroupTournamentId), roles);

// Resuelve el torneo desde :id de una inscripción
export const requireRegistrationRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("id", getRegistrationTournamentId), roles);

// Resuelve el torneo desde :id de una fila de posiciones
export const requireStandingRowRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("id", getStandingRowTournamentId), roles);

// Resuelve el torneo desde :memberId de una membresía
export const requireMembershipRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("memberId", getMembershipTournamentId), roles);

// Resuelve el torneo desde :id de una entrada de roster → su edición.
// Sin mutar el contexto: el resolver lee la fila y delega al guard de edición.
export const requireRosterEntryRole = (...roles: TournamentScopedRole[]) =>
	tournamentScoped(fromParam("id", getRosterEntryTournamentId), roles);

async function getRosterEntryTournamentId(id: string): Promise<string> {
	const entry = await findRosterEntryById(id);
	return getEditionTournamentId(entry.editionId);
}

function isGlobalAdmin(ctx: ParsedContext): boolean {
	return ctx.user?.role === "super_admin" || ctx.user?.role === "admin";
}

async function assertTournamentAccess(
	tournamentId: string,
	userId: string,
	roles: TournamentScopedRole[],
): Promise<void> {
	const membership = await findTournamentMembership(tournamentId, userId);
	if (!membership || !roles.includes(membership.role as TournamentScopedRole)) {
		throw DomainError.forbidden(
			`You need one of these roles in this tournament: ${roles.join(", ")}`,
		);
	}
}

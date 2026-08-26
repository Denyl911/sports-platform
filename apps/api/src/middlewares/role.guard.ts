import { DomainError } from "../services/errors";
import { getMatchTournamentId } from "../services/match.service";
import { getUserRoleInTournament } from "../services/user.service";
import type { Requester } from "./auth.middleware";

type GlobalRole = "super_admin" | "admin";
type TournamentScopedRole =
	| "organizer"
	| "referee"
	| "statistician"
	| "viewer_staff";

interface GuardContext {
	requester: Requester;
	params?: Record<string, string>;
	body?: unknown;
}

function parseGuardContext(ctx: unknown): GuardContext {
	if (!ctx || typeof ctx !== "object") {
		throw DomainError.unauthorized("Authentication required");
	}
	return ctx as GuardContext;
}

function resolveTournamentId(ctx: GuardContext): string | null {
	const fromParams = ctx.params?.tournamentId;
	if (fromParams) return fromParams;

	if (ctx.body && typeof ctx.body === "object") {
		const value = (ctx.body as Record<string, unknown>).tournamentId;
		if (typeof value === "string") return value;
	}
	return null;
}

function isGlobalAdmin(requester: Requester): boolean {
	return requester.role === "super_admin" || requester.role === "admin";
}

// Exige uno de los roles globales de la plataforma
export function requireGlobalRole(...roles: GlobalRole[]) {
	return async (rawCtx: unknown) => {
		const { requester } = parseGuardContext(rawCtx);
		if (!roles.includes(requester.role as GlobalRole)) {
			throw DomainError.forbidden(
				`This action requires one of: ${roles.join(", ")}`,
			);
		}
	};
}

// Exige una membresía con uno de los roles indicados en el torneo
export function requireTournamentRole(...roles: TournamentScopedRole[]) {
	return async (rawCtx: unknown) => {
		const ctx = parseGuardContext(rawCtx);
		if (isGlobalAdmin(ctx.requester)) return;

		const tournamentId = resolveTournamentId(ctx);
		if (!tournamentId) {
			throw DomainError.badRequest(
				"A tournamentId is required for this action",
			);
		}

		const result = await getUserRoleInTournament(
			tournamentId,
			ctx.requester.id,
		);
		if (
			!result.allowed ||
			!result.tournamentRole ||
			!roles.includes(result.tournamentRole as TournamentScopedRole)
		) {
			throw DomainError.forbidden(
				`You need one of these roles in this tournament: ${roles.join(", ")}`,
			);
		}
	};
}

// Igual que requireTournamentRole pero resuelve el torneo desde :id del partido
export function requireMatchRole(...roles: TournamentScopedRole[]) {
	return async (rawCtx: unknown) => {
		const ctx = parseGuardContext(rawCtx);
		if (isGlobalAdmin(ctx.requester)) return;

		const matchId = ctx.params?.id;
		if (!matchId) {
			throw DomainError.badRequest("A match id is required for this action");
		}

		const tournamentId = await getMatchTournamentId(matchId);
		const result = await getUserRoleInTournament(
			tournamentId,
			ctx.requester.id,
		);
		if (
			!result.allowed ||
			!result.tournamentRole ||
			!roles.includes(result.tournamentRole as TournamentScopedRole)
		) {
			throw DomainError.forbidden(
				`You need one of these roles in this tournament: ${roles.join(", ")}`,
			);
		}
	};
}

import { DomainError } from "../services/errors";
import { getMatchTournamentId } from "../services/match.service";
import { getUserRoleInTournament } from "../services/user.service";

type GlobalRole = "super_admin" | "admin";
type TournamentScopedRole =
  | "organizer"
  | "referee"
  | "statistician"
  | "viewer_staff";

// Contexto expuesto por el macro `auth` de jwtMiddleware
interface AuthContext {
  user?: { role: string; isActive?: boolean };
  userId?: string;
  userRole?: string;
  params?: Record<string, string>;
  body?: unknown;
}

function parseAuthContext(ctx: unknown): AuthContext & { userId: string; userRole: string; user: { role: string } } {
  const c = (ctx ?? {}) as AuthContext;
  if (!c.userId || !c.userRole || !c.user) {
    throw DomainError.unauthorized("Authentication required");
  }
  return c as AuthContext & { userId: string; userRole: string; user: { role: string } };
}

function resolveTournamentId(ctx: AuthContext): string | null {
  const fromParams = ctx.params?.tournamentId;
  if (fromParams) return fromParams;

  if (ctx.body && typeof ctx.body === "object") {
    const value = (ctx.body as Record<string, unknown>).tournamentId;
    if (typeof value === "string") return value;
  }
  return null;
}

// Exige uno de los roles globales de la plataforma
export function requireGlobalRole(...roles: GlobalRole[]) {
  return async (rawCtx: unknown) => {
    const ctx = parseAuthContext(rawCtx);
    if (!roles.includes(ctx.userRole as GlobalRole)) {
      throw DomainError.forbidden(
        `This action requires one of: ${roles.join(", ")}`
      );
    }
  };
}

// Exige una membresía con uno de los roles indicados en el torneo
export function requireTournamentRole(
  ...roles: TournamentScopedRole[]
) {
  return async (rawCtx: unknown) => {
    const ctx = parseAuthContext(rawCtx);
    if (isGlobalAdmin(ctx)) return;

    const tournamentId = resolveTournamentId(ctx);
    if (!tournamentId) {
      throw DomainError.badRequest("A tournamentId is required for this action");
    }

    const result = await getUserRoleInTournament(tournamentId, ctx.userId);
    assertTournamentAccess(result, roles);
  };
}

// Igual que requireTournamentRole pero resuelve el torneo desde :id del partido
export function requireMatchRole(...roles: TournamentScopedRole[]) {
  return async (rawCtx: unknown) => {
    const ctx = parseAuthContext(rawCtx);
    if (isGlobalAdmin(ctx)) return;

    const matchId = ctx.params?.id;
    if (!matchId) {
      throw DomainError.badRequest("A match id is required for this action");
    }

    const tournamentId = await getMatchTournamentId(matchId);
    const result = await getUserRoleInTournament(tournamentId, ctx.userId);
    assertTournamentAccess(result, roles);
  };
}

function isGlobalAdmin(ctx: AuthContext): boolean {
  return (
    ctx.user?.role === "super_admin" ||
    ctx.user?.role === "admin"
  );
}

function assertTournamentAccess(
  result: Awaited<ReturnType<typeof getUserRoleInTournament>>,
  roles: TournamentScopedRole[]
): void {
  if (
    !result.allowed ||
    !result.tournamentRole ||
    !roles.includes(result.tournamentRole as TournamentScopedRole)
  ) {
    throw DomainError.forbidden(
      `You need one of these roles in this tournament: ${roles.join(", ")}`
    );
  }
}

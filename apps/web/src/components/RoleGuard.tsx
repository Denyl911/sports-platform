import { useMyTournamentMembership } from "@sports/api-client/hooks";
import { Navigate } from "@tanstack/react-router";
import type * as React from "react";
import { api } from "../lib/api";
import { type AuthUser, useAuth } from "../lib/auth";

export function RoleGuard({
	children,
	roles,
	fallback = "/auth/login",
}: {
	children: React.ReactNode;
	roles: AuthUser["role"][];
	fallback?: string;
}) {
	const { user, isLoading, hasRole } = useAuth();

	if (isLoading) {
		return (
			<div className="demo-center text-sm text-[var(--sea-ink-soft)]">
				Cargando…
			</div>
		);
	}
	if (!user) return <Navigate to={fallback} />;
	if (!hasRole(...roles)) {
		return (
			<div className="demo-page">
				<div className="demo-alert-danger">
					No tienes permisos para esta sección. Requiere: {roles.join(", ")}
				</div>
			</div>
		);
	}
	return <>{children}</>;
}

// Guard espejando requireGlobalRole / requireTournamentRole del backend.
// Ahora usa GET /tournaments/:id/members/me para verificar membresía real.
export function useCanTournamentRole(
	tournamentId: string | null,
	...roles: AuthUser["role"][]
): { can: boolean; isLoading: boolean } {
	const { user, hasRole, isLoading: authLoading } = useAuth();
	const shouldBypass = !!user && hasRole("super_admin", "admin");
	const { data, isPending, error } = useMyTournamentMembership(
		api,
		tournamentId ?? "",
		{
			enabled: !!tournamentId && !!user && !shouldBypass,
			retry: false,
		} as never,
	);

	if (authLoading || isPending) return { can: false, isLoading: true };
	if (!user || !tournamentId) return { can: false, isLoading: false };
	if (shouldBypass) return { can: true, isLoading: false };
	if (error || !data) return { can: false, isLoading: false };
	const membership = data as { role: string };
	return {
		can: roles.includes(membership.role as AuthUser["role"]),
		isLoading: false,
	};
}

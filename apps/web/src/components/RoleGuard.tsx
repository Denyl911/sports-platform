import * as React from "react";
import { Navigate } from "@tanstack/react-router";
import { useAuth, type AuthUser } from "../lib/auth";

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
		return <div className="demo-center text-sm text-[var(--sea-ink-soft)]">Cargando…</div>;
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
// Para torneo-scoped, el backend ya valida; aquí solo ocultamos UI si no es organizer/referee/etc.
// El check real es la API (401/403). Este helper es para UX.
export function useCanTournamentRole(
	tournamentId: string | null,
	...roles: AuthUser["role"][]
): { can: boolean; isLoading: boolean } {
	const { user, hasRole, isLoading } = useAuth();
	// super_admin/admin bypassan cualquier check de torneo
	if (isLoading) return { can: false, isLoading: true };
	if (!user || !tournamentId) return { can: false, isLoading: false };
	if (hasRole("super_admin", "admin")) return { can: true, isLoading: false };
	// Sin endpoint /tournaments/:id/members/me, asumimos que si no es global, la UI muestra
	// y el backend decidirá 403. Para checks finos, el loader puede intentar una mutación dry-run.
	// Aquí devolvemos can=false para no mostrar botones sensibles por defecto.
	// El caller puede sobre-escribir con su propio fetch a /users/me/memberships si se añade.
	const _roles = roles;
	void _roles;
	return { can: false, isLoading: false };
}

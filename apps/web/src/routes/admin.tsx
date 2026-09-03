import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "../components/RoleGuard";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<RoleGuard
			roles={["admin", "organizer", "super_admin", "referee", "statistician"]}
		>
			<div className="page-wrap py-6">
				<div className="flex gap-6">
					<aside className="hidden w-48 shrink-0 sm:block">
						<nav className="sticky top-20 flex flex-col gap-1 text-sm">
							<Link
								to="/admin"
								activeOptions={{ exact: true }}
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Dashboard
							</Link>
							<Link
								to="/admin/tournaments"
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Torneos
							</Link>
							<Link
								to="/admin/venues"
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Sedes
							</Link>
							<Link
								to="/admin/clubs"
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Clubes
							</Link>
							<Link
								to="/admin/teams"
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Equipos
							</Link>
							<Link
								to="/admin/players"
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Jugadores
							</Link>
							<Link
								to="/admin/sports"
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Deportes
							</Link>
							<Link
								to="/admin/users"
								activeProps={{
									className:
										"bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]",
								}}
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Usuarios
							</Link>
							<Link
								to="/teams"
								className="rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)"
							>
								Equipos (público)
							</Link>
						</nav>
					</aside>
					<div className="min-w-0 flex-1">
						<nav className="mb-4 flex flex-wrap gap-2 text-xs sm:hidden">
							<Link to="/admin" className="demo-pill">
								Dashboard
							</Link>
							<Link to="/admin/tournaments" className="demo-pill">
								Torneos
							</Link>
							<Link to="/admin/venues" className="demo-pill">
								Sedes
							</Link>
							<Link to="/admin/clubs" className="demo-pill">
								Clubes
							</Link>
							<Link to="/admin/teams" className="demo-pill">
								Equipos
							</Link>
							<Link to="/admin/players" className="demo-pill">
								Jugadores
							</Link>
							<Link to="/admin/sports" className="demo-pill">
								Deportes
							</Link>
							<Link to="/admin/users" className="demo-pill">
								Usuarios
							</Link>
						</nav>
						<Outlet />
					</div>
				</div>
			</div>
		</RoleGuard>
	);
}

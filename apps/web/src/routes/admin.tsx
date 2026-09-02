import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { RoleGuard } from "../components/RoleGuard";

export const Route = createFileRoute("/admin")({
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<RoleGuard roles={["admin", "organizer", "super_admin"]}>
			<div className="page-wrap py-6">
				<nav className="mb-6 flex flex-wrap gap-2 text-sm">
					<Link
						to="/admin"
						activeProps={{ className: "font-bold text-[var(--sea-ink)]" }}
						className="text-[var(--sea-ink-soft)]"
					>
						Dashboard
					</Link>
					<span className="text-[var(--line)]">/</span>
					<Link to="/admin" className="text-[var(--sea-ink-soft)]">
						Torneos
					</Link>
				</nav>
				<Outlet />
			</div>
		</RoleGuard>
	);
}

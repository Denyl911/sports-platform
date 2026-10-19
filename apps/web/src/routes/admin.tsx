import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminMobileNav, AdminSidebar } from "../components/admin-nav";
import { RoleGuard } from "../components/RoleGuard";

export const Route = createFileRoute("/admin")({
	head: () => ({
		meta: [{ title: "Admin — Sports Platform" }],
	}),
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<RoleGuard
			roles={["admin", "organizer", "super_admin", "referee", "statistician"]}
		>
			<div className="page-wrap py-6">
				<div className="flex gap-6">
					<aside className="hidden w-56 shrink-0 sm:block">
						<AdminSidebar />
					</aside>
					<div className="min-w-0 flex-1">
						<AdminMobileNav />
						<Outlet />
					</div>
				</div>
			</div>
		</RoleGuard>
	);
}

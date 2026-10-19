import { Link } from "@tanstack/react-router";

/**
 * Nav admin en una sola fuente: la sidebar (≥sm) y las pills (<sm)
 * renderizan de aquí y por eso no pueden desalinearse de nuevo.
 * `exact` solo en Dashboard — /admin es prefijo de todo lo demás.
 */
export interface AdminNavItem {
	to: string;
	label: string;
	exact?: boolean;
}

export interface AdminNavGroup {
	title: string;
	items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
	{
		title: "Competencia",
		items: [
			{ to: "/admin", label: "Dashboard", exact: true },
			{ to: "/admin/tournaments", label: "Torneos" },
		],
	},
	{
		title: "Catálogo",
		items: [
			{ to: "/admin/venues", label: "Sedes" },
			{ to: "/admin/clubs", label: "Clubes" },
			{ to: "/admin/teams", label: "Equipos" },
			{ to: "/admin/players", label: "Jugadores" },
			{ to: "/admin/sports", label: "Deportes" },
		],
	},
	{
		title: "Acceso",
		items: [{ to: "/admin/users", label: "Usuarios" }],
	},
];

const sidebarActive = "bg-[var(--chip-bg)] font-bold text-[var(--sea-ink)]";
const sidebarIdle =
	"rounded-xl px-3 py-2 text-(--sea-ink-soft) hover:bg-(--surface)";

export function AdminSidebar() {
	return (
		<nav className="sticky top-20 flex flex-col gap-1 text-sm">
			{ADMIN_NAV.map((group) => (
				<div key={group.title}>
					<div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-widest text-(--sea-ink-soft) uppercase">
						{group.title}
					</div>
					{group.items.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							{...(item.exact ? { activeOptions: { exact: true } } : {})}
							className={sidebarIdle}
							activeProps={{ className: `${sidebarIdle} ${sidebarActive}` }}
						>
							{item.label}
						</Link>
					))}
				</div>
			))}
		</nav>
	);
}

const pillActive = "font-bold text-(--sea-ink)";

export function AdminMobileNav() {
	return (
		<nav className="mb-4 flex flex-wrap gap-2 text-xs sm:hidden">
			{ADMIN_NAV.map((group) =>
				group.items.map((item) => (
					<Link
						key={item.to}
						to={item.to}
						{...(item.exact ? { activeOptions: { exact: true } } : {})}
						className="demo-pill"
						activeProps={{ className: `demo-pill ${pillActive}` }}
					>
						{item.label}
					</Link>
				)),
			)}
		</nav>
	);
}

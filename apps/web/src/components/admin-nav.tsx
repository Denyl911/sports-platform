import { Link, useMatches } from "@tanstack/react-router";
import * as React from "react";

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

const COLLAPSE_KEY = "admin.nav.collapsed";

/** Los grupos que están plegados hoy; el estado vive en localStorage. */
function readCollapsed(): string[] {
	try {
		const raw = window.localStorage.getItem(COLLAPSE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((t) => typeof t === "string")
			: [];
	} catch {
		return [];
	}
}

export function AdminSidebar() {
	const [collapsed, setCollapsed] = React.useState<string[]>([]);
	const matches = useMatches();
	const pathname = matches.at(-1)?.pathname ?? "";
	React.useEffect(() => {
		setCollapsed(readCollapsed());
	}, []);

	const toggle = (title: string) => {
		setCollapsed((prev) => {
			const isCollapsed = prev.includes(title);
			const next = isCollapsed
				? prev.filter((t) => t !== title)
				: [...prev, title];
			try {
				window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
			} catch {
				// Sin almacenamiento la sidebar sigue funcionando en la sesión.
			}
			return next;
		});
	};

	return (
		<nav className="sticky top-20 flex flex-col gap-1 text-sm">
			{ADMIN_NAV.map((group) => {
				const userCollapsed = collapsed.includes(group.title);
				// Un grupo con la sección activa reabre: el usuario no debe
				// buscar dónde está parado.
				const hasActive = group.items.some((item) => item.to === pathname);
				const isOpen = !userCollapsed || hasActive;
				return (
					<div key={group.title}>
						<button
							type="button"
							onClick={() => toggle(group.title)}
							aria-expanded={!userCollapsed}
							className="flex w-full items-center justify-between px-3 pt-3 pb-1 text-[10px] font-bold tracking-widest text-(--sea-ink-soft) uppercase hover:text-(--sea-ink)"
						>
							{group.title}
							<span aria-hidden="true" className="text-sm leading-none">
								{userCollapsed ? "+" : "–"}
							</span>
						</button>
						{isOpen &&
							group.items.map((item) => (
								<Link
									key={item.to}
									to={item.to}
									{...(item.exact ? { activeOptions: { exact: true } } : {})}
									className={
										hasActive ? `${sidebarIdle} ${sidebarActive}` : sidebarIdle
									}
									activeProps={{
										className: `${sidebarIdle} ${sidebarActive}`,
									}}
								>
									{item.label}
								</Link>
							))}
					</div>
				);
			})}
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

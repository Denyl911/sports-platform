import {
	Building2,
	ChevronDown,
	ChevronRight,
	DECORATIVE,
	Dumbbell,
	Gauge,
	type LucideIcon,
	MapPin,
	Trophy,
	UserCog,
	UserRound,
	Users,
} from "@sports/ui";
import { Link, useMatches } from "@tanstack/react-router";
import * as React from "react";

/**
 * Nav admin en una sola fuente: la sidebar (≥sm) y las pills (<sm)
 * renderizan de aquí y por eso no pueden desalinearse de nuevo.
 * `exact` solo en Dashboard — /admin es prefijo de todo lo demás.
 * El icono es el del vocabulario de dominio (packages/ui icon.ts), uno por
 * término, y viaja con el item para que las dos navs digan lo mismo.
 */
export interface AdminNavItem {
	to: string;
	label: string;
	icon: LucideIcon;
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
			{ to: "/admin", label: "Dashboard", icon: Gauge, exact: true },
			{ to: "/admin/tournaments", label: "Torneos", icon: Trophy },
		],
	},
	{
		title: "Catálogo",
		items: [
			{ to: "/admin/venues", label: "Sedes", icon: MapPin },
			{ to: "/admin/clubs", label: "Clubes", icon: Building2 },
			{ to: "/admin/teams", label: "Equipos", icon: Users },
			{ to: "/admin/players", label: "Jugadores", icon: UserRound },
			{ to: "/admin/sports", label: "Deportes", icon: Dumbbell },
		],
	},
	{
		title: "Acceso",
		items: [{ to: "/admin/users", label: "Usuarios", icon: UserCog }],
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
	// El pathname del match llega con barra final ("/admin/venues/"): sin
	// normalizar, el `to` del nav nunca coincide y el grupo de la sección
	// activa no se reabre.
	const pathname = (matches.at(-1)?.pathname ?? "").replace(/\/+$/, "");
	const isActiveItem = (item: AdminNavItem) =>
		item.exact
			? pathname === item.to
			: pathname === item.to || pathname.startsWith(`${item.to}/`);
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
				const hasActive = group.items.some(isActiveItem);
				const isOpen = !userCollapsed || hasActive;
				return (
					<div key={group.title}>
						<button
							type="button"
							onClick={() => toggle(group.title)}
							aria-expanded={!userCollapsed}
							className="flex w-full items-center justify-between gap-2 rounded-lg px-3 pt-3 pb-1 text-[10px] font-bold tracking-widest text-(--sea-ink-soft) uppercase hover:text-(--sea-ink)"
						>
							{group.title}
							{userCollapsed ? (
								<ChevronRight {...DECORATIVE} className="size-3.5" />
							) : (
								<ChevronDown {...DECORATIVE} className="size-3.5" />
							)}
						</button>
						{isOpen && (
							<div className="flex flex-col gap-0.5">
								{group.items.map((item) => (
									<Link
										key={item.to}
										to={item.to}
										{...(item.exact ? { activeOptions: { exact: true } } : {})}
										className={`${sidebarIdle} flex items-center gap-2 whitespace-nowrap`}
										activeProps={{
											className: `${sidebarIdle} ${sidebarActive} flex items-center gap-2 whitespace-nowrap`,
										}}
									>
										<item.icon {...DECORATIVE} className="size-4 shrink-0" />
										{item.label}
									</Link>
								))}
							</div>
						)}
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
						<item.icon {...DECORATIVE} className="size-3.5" />
						{item.label}
					</Link>
				)),
			)}
		</nav>
	);
}

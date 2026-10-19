import { Sheet } from "@sports/ui";
import { Link } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

interface NavItem {
	to: string;
	label: string;
}

type AdminRole = "admin" | "organizer" | "super_admin";

const ADMIN_ROLES: AdminRole[] = [
	"admin",
	"organizer",
	"super_admin",
]; /** Nav reducida: lo visible en desktop son las tres rutas de competencia. */
const PRIMARY_NAV: NavItem[] = [
	{ to: "/tournaments", label: "Torneos" },
	{ to: "/matches", label: "Partidos" },
	{ to: "/teams", label: "Equipos" },
];

/** El catálogo restante y About viven debajo de “Más” y en el menú móvil. */
const SECONDARY_NAV: NavItem[] = [
	{ to: "/clubs", label: "Clubes" },
	{ to: "/players", label: "Jugadores" },
	{ to: "/venues", label: "Sedes" },
	{ to: "/sports", label: "Deportes" },
	{ to: "/about", label: "About" },
];

const navLink = "nav-link";

function MoreMenu() {
	const [open, setOpen] = React.useState(false);
	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [open]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				className={navLink}
				aria-expanded={open}
				onClick={() => setOpen((v) => !v)}
			>
				Más
			</button>
			{open && (
				<div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-(--line) bg-(--surface-strong) p-1.5 shadow-[0_12px_32px_rgba(23,58,64,0.18)]">
					{SECONDARY_NAV.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							onClick={() => setOpen(false)}
							className="block rounded-lg px-3 py-2 text-(--sea-ink-soft) no-underline hover:bg-(--surface) hover:text-(--sea-ink)"
						>
							{item.label}
						</Link>
					))}
				</div>
			)}
		</div>
	);
}

export default function Header() {
	const { user, isAuthenticated, logout, hasRole } = useAuth();
	const [menuOpen, setMenuOpen] = React.useState(false);

	return (
		<header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) px-4 backdrop-blur-lg">
			<nav className="page-wrap flex items-center gap-x-3 gap-y-2 py-3 sm:py-4">
				<h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-sm text-(--sea-ink) no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
					>
						<span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
						Sports Platform
					</Link>
				</h2>

				{/* Desktop: nav reducida + “Más” */}
				<div className="ml-2 hidden items-center gap-x-4 text-sm font-semibold md:flex">
					{PRIMARY_NAV.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className={navLink}
							activeProps={{ className: `${navLink} is-active` }}
						>
							{item.label}
						</Link>
					))}
					<MoreMenu />
				</div>

				{/* Móvil: hamburguesa */}
				<div className="ml-1 md:hidden">
					<button
						type="button"
						aria-label="Abrir menú"
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen(true)}
						className="rounded-full border border-(--line) bg-(--chip-bg) px-3 py-1.5 text-xs font-bold text-(--sea-ink) hover:bg-(--surface-strong)"
					>
						☰
					</button>
				</div>

				<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
					{isAdmin(hasRole) && (
						<Link
							to="/admin"
							className="hidden rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-xs font-bold text-(--sea-ink) no-underline hover:bg-(--surface-strong) md:inline-block"
						>
							Admin
						</Link>
					)}
					{isAuthenticated ? (
						<button
							type="button"
							onClick={logout}
							className="rounded-full border border-(--line) bg-(--chip-bg) px-3 py-1.5 text-xs font-bold text-(--sea-ink-soft) hover:bg-(--surface-strong)"
						>
							Salir
						</button>
					) : (
						<Link
							to="/auth/login"
							className="rounded-full border border-(--lagoon-deep) bg-(--lagoon) px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
						>
							Entrar
						</Link>
					)}
					<ThemeToggle />
				</div>
			</nav>

			<Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menú">
				<SheetSection title="Competencia">
					<SheetLink
						to="/"
						label="Home"
						onNavigate={() => setMenuOpen(false)}
					/>
					{PRIMARY_NAV.map((item) => (
						<SheetLink
							key={item.to}
							to={item.to}
							label={item.label}
							onNavigate={() => setMenuOpen(false)}
						/>
					))}
				</SheetSection>
				<SheetSection title="Catálogo">
					{SECONDARY_NAV.map((item) => (
						<SheetLink
							key={item.to}
							to={item.to}
							label={item.label}
							onNavigate={() => setMenuOpen(false)}
						/>
					))}
				</SheetSection>
				<SheetSection title="Cuenta">
					{isAdmin(hasRole) && (
						<SheetLink
							to="/admin"
							label="Admin"
							onNavigate={() => setMenuOpen(false)}
						/>
					)}
					{isAuthenticated ? (
						<SheetLink
							to="/profile"
							label={user ? `${user.fullName} · ${user.role}` : "Mi cuenta"}
							onNavigate={() => setMenuOpen(false)}
						/>
					) : (
						<>
							<SheetLink
								to="/auth/login"
								label="Iniciar sesión"
								onNavigate={() => setMenuOpen(false)}
							/>
							<SheetLink
								to="/auth/register"
								label="Crear cuenta"
								onNavigate={() => setMenuOpen(false)}
							/>
						</>
					)}
				</SheetSection>
			</Sheet>
		</header>
	);
}

function isAdmin(hasRole: (...roles: AdminRole[]) => boolean) {
	return hasRole(...ADMIN_ROLES);
}

function SheetSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mb-4">
			<div className="px-1 pb-1 text-[10px] font-bold tracking-widest text-(--sea-ink-soft) uppercase">
				{title}
			</div>
			{children}
		</div>
	);
}

function SheetLink({
	to,
	label,
	onNavigate,
}: {
	to: string;
	label: string;
	onNavigate: () => void;
}) {
	return (
		<Link
			to={to}
			onClick={onNavigate}
			className="block rounded-lg px-3 py-2 text-(--sea-ink-soft) no-underline hover:bg-(--surface) hover:text-(--sea-ink)"
			activeProps={{ className: "bg-(--surface) font-bold text-(--sea-ink)" }}
		>
			{label}
		</Link>
	);
}

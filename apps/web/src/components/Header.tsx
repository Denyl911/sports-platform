import { Link } from "@tanstack/react-router";
import { useAuth } from "../lib/auth";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
	const { user, isAuthenticated, logout, hasRole } = useAuth();
	return (
		<header className="sticky top-0 z-50 border-b border-(--line) bg-(--header-bg) px-4 backdrop-blur-lg">
			<nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
				<h2 className="m-0 shrink-0 text-base font-semibold tracking-tight">
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-full border border-(--chip-line) bg-(--chip-bg) px-3 py-1.5 text-sm text-(--sea-ink) no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
					>
						<span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
						Sports Platform
					</Link>
				</h2>

				<div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-0 sm:w-auto sm:flex-nowrap sm:pb-0">
					<Link
						to="/"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Home
					</Link>
					<Link
						to="/tournaments"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Torneos
					</Link>
					<Link
						to="/matches"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Partidos
					</Link>
					<Link
						to="/teams"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Equipos
					</Link>
					<Link
						to="/players"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Jugadores
					</Link>
					<Link
						to="/venues"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Sedes
					</Link>
					<Link
						to="/sports"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						Deportes
					</Link>
					<Link
						to="/about"
						className="nav-link"
						activeProps={{ className: "nav-link is-active" }}
					>
						About
					</Link>
					{hasRole("admin", "organizer", "super_admin") && (
						<Link
							to="/admin"
							className="nav-link"
							activeProps={{ className: "nav-link is-active" }}
						>
							Admin
						</Link>
					)}
					{isAuthenticated ? (
						<span className="hidden sm:inline text-xs text-(--sea-ink-soft)">
							{user?.fullName} · {user?.role}
						</span>
					) : null}
				</div>

				<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
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
		</header>
	);
}

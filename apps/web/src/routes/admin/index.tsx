import {
	useMatches,
	useTeams,
	useTournaments,
	useUsers,
} from "@sports/api-client/hooks";
import {
	Building2,
	DECORATIVE,
	Dumbbell,
	ExternalLink,
	type LucideIcon,
	MapPin,
	Radio,
	Trophy,
	UserCog,
	UserRound,
	Users,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FirstTournamentGuide } from "../../components/FirstTournamentGuide";
import { api } from "../../lib/api";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	const { data: tournamentsData } = useTournaments(api);
	const { data: liveData } = useMatches(api, { status: "in_progress" });
	const { data: teamsData } = useTeams(api);
	const { data: usersData } = useUsers(api);

	const totals = {
		torneos: (tournamentsData as { total: number } | undefined)?.total,
		enVivo: (liveData as { total: number } | undefined)?.total,
		equipos: (teamsData as { total: number } | undefined)?.total,
		usuarios: (usersData as { total: number } | undefined)?.total,
	};

	const cards: Array<{
		to: string;
		title: string;
		desc: string;
		icon: LucideIcon;
		stat: number | undefined;
		statOne: string;
		statMany: string;
	}> = [
		{
			to: "/admin/tournaments",
			title: "Torneos",
			desc: "Crear y editar torneos, ediciones, etapas, grupos y miembros.",
			icon: Trophy,
			stat: totals.torneos,
			statOne: "torneo",
			statMany: "torneos",
		},
		{
			to: "/admin/clubs",
			title: "Clubes",
			desc: "Catálogo de clubes.",
			icon: Building2,
			stat: undefined,
			statOne: "club",
			statMany: "clubes",
		},
		{
			to: "/admin/teams",
			title: "Equipos",
			desc: "Equipos por club y categoría.",
			icon: Users,
			stat: totals.equipos,
			statOne: "equipo",
			statMany: "equipos",
		},
		{
			to: "/admin/players",
			title: "Jugadores",
			desc: "Registro de jugadores.",
			icon: UserRound,
			stat: undefined,
			statOne: "jugador",
			statMany: "jugadores",
		},
		{
			to: "/admin/venues",
			title: "Sedes",
			desc: "Canchas y sedes de partidos.",
			icon: MapPin,
			stat: undefined,
			statOne: "sede",
			statMany: "sedes",
		},
		{
			to: "/admin/sports",
			title: "Deportes",
			desc: "Deportes y tipos de evento.",
			icon: Dumbbell,
			stat: undefined,
			statOne: "deporte",
			statMany: "deportes",
		},
		{
			to: "/admin/users",
			title: "Usuarios",
			desc: "Usuarios y membresías por torneo.",
			icon: UserCog,
			stat: totals.usuarios,
			statOne: "usuario",
			statMany: "usuarios",
		},
	];

	return (
		<div className="space-y-6">
			<div className="island-shell rounded-2xl p-6">
				<h1 className="text-2xl font-black text-(--sea-ink)">Admin</h1>
				<p className="mt-2 text-sm text-(--sea-ink-soft)">
					Gestión de torneos, fixture y membresías. Requiere rol{" "}
					<code>admin</code> / <code>organizer</code> (o{" "}
					<code>super_admin</code>).
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<Link
						to="/"
						className="demo-button-secondary inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm"
					>
						Volver al sitio público
						<ExternalLink {...DECORATIVE} className="size-4" />
					</Link>
					{totals.enVivo != null && totals.enVivo > 0 && (
						<span className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold">
							<Radio {...DECORATIVE} className="size-4 text-[var(--palm)]" />
							{totals.enVivo} en vivo ahora
						</span>
					)}
				</div>
			</div>

			{totals.torneos === 0 && <FirstTournamentGuide />}

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{cards.map((c) => (
					<Link key={c.to} to={c.to} className="demo-card no-underline">
						<span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-(--chip-bg) text-(--sea-ink)">
							<c.icon {...DECORATIVE} className="size-5" />
						</span>
						<h3 className="font-bold">{c.title}</h3>
						<p className="demo-muted text-sm">{c.desc}</p>
						{c.stat != null && (
							<p className="mt-2 text-2xl font-black text-(--sea-ink)">
								{c.stat}{" "}
								<span className="text-sm font-normal text-(--sea-ink-soft)">
									{c.stat === 1 ? c.statOne : c.statMany}
								</span>
							</p>
						)}
					</Link>
				))}
			</div>
		</div>
	);
}

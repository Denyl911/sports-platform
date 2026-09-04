import {
	useMatches,
	useTeams,
	useTournaments,
	useUsers,
} from "@sports/api-client/hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
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

	const cards = [
		{
			to: "/admin/tournaments",
			title: "Torneos",
			desc: "Crear y editar torneos, ediciones, etapas, grupos y miembros.",
			stat: totals.torneos,
			statLabel: "torneos",
		},
		{
			to: "/admin/clubs",
			title: "Clubes",
			desc: "Catálogo de clubes.",
			stat: undefined,
			statLabel: "",
		},
		{
			to: "/admin/teams",
			title: "Equipos",
			desc: "Equipos por club y categoría.",
			stat: totals.equipos,
			statLabel: "equipos",
		},
		{
			to: "/admin/players",
			title: "Jugadores",
			desc: "Registro de jugadores.",
			stat: undefined,
			statLabel: "",
		},
		{
			to: "/admin/venues",
			title: "Sedes",
			desc: "Canchas y sedes de partidos.",
			stat: undefined,
			statLabel: "",
		},
		{
			to: "/admin/sports",
			title: "Deportes",
			desc: "Deportes y tipos de evento.",
			stat: undefined,
			statLabel: "",
		},
		{
			to: "/admin/users",
			title: "Usuarios",
			desc: "Usuarios y membresías por torneo.",
			stat: totals.usuarios,
			statLabel: "usuarios",
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
						className="demo-button-secondary rounded-full border px-4 py-2 text-sm"
					>
						Volver al sitio público
					</Link>
					{totals.enVivo != null && totals.enVivo > 0 && (
						<span className="rounded-full border px-4 py-2 text-sm font-bold">
							{totals.enVivo} en vivo ahora
						</span>
					)}
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{cards.map((c) => (
					<Link key={c.to} to={c.to} className="demo-card no-underline">
						<h3 className="font-bold">{c.title}</h3>
						<p className="demo-muted text-sm">{c.desc}</p>
						{c.stat != null && (
							<p className="mt-2 text-2xl font-black text-(--sea-ink)">
								{c.stat}{" "}
								<span className="text-sm font-normal text-(--sea-ink-soft)">
									{c.statLabel}
								</span>
							</p>
						)}
					</Link>
				))}
			</div>
		</div>
	);
}

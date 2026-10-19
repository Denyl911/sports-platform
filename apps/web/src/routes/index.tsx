import { type MatchWithTeams, queryKeys, unwrap } from "@sports/api-client";
import {
	AnimatedList,
	Badge,
	Card,
	CardHeader,
	CardTitle,
	CountUp,
	EmptyState,
	SplitText,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MATCH_STATUS_LABELS } from "../components/live-ui";
import { api } from "../lib/api";

type TournamentItem = {
	id: string;
	name: string;
	sportId: string;
	description?: string | null;
};

const LIVE_QUERY = { status: "in_progress", limit: 6 } as const;
const RECENT_QUERY = { status: "finished", limit: 6 } as const;

export const Route = createFileRoute("/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.tournaments.list(),
			queryFn: () => unwrap(api.tournaments.get({ query: {} })),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.matches.list({ ...LIVE_QUERY }),
			queryFn: () => unwrap(api.matches.get({ query: { ...LIVE_QUERY } })),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.matches.list({ ...RECENT_QUERY }),
			queryFn: () => unwrap(api.matches.get({ query: { ...RECENT_QUERY } })),
		});
	},
	head: () => ({
		meta: [
			{ title: "Sports Platform — Resultados y marcadores en vivo" },
			{
				name: "description",
				content:
					"Partidos en vivo, resultados recientes y torneos multideporte en curso.",
			},
		],
	}),
	component: HomePage,
});

function HomePage() {
	const navigate = useNavigate();
	const { data: tournamentsData } = useSuspenseQuery({
		queryKey: queryKeys.tournaments.list(),
		queryFn: () => unwrap(api.tournaments.get({ query: {} })),
	});
	const { data: liveData } = useSuspenseQuery({
		queryKey: queryKeys.matches.list({ ...LIVE_QUERY }),
		queryFn: () => unwrap(api.matches.get({ query: { ...LIVE_QUERY } })),
	});
	const { data: recentData } = useSuspenseQuery({
		queryKey: queryKeys.matches.list({ ...RECENT_QUERY }),
		queryFn: () => unwrap(api.matches.get({ query: { ...RECENT_QUERY } })),
	});

	const tournaments = (
		tournamentsData as { items: TournamentItem[]; total: number }
	).items.slice(0, 6);
	const liveMatches = (liveData as { items: MatchWithTeams[]; total: number })
		.items;
	const recentMatches = (
		recentData as { items: MatchWithTeams[]; total: number }
	).items;

	return (
		<main className="page-wrap space-y-8 px-4 pb-8 pt-6">
			<section className="island-shell rise-in relative overflow-hidden rounded-4xl px-6 py-10 sm:px-10 sm:py-14">
				<div className="hero-drift pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="hero-drift hero-drift-slow pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
				<p className="island-kicker mb-3">Plataforma multideporte</p>
				<SplitText
					tag="h1"
					text="Sports Platform"
					className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-(--sea-ink) sm:text-6xl"
					textAlign="left"
					effect="rise"
					staggerSeconds={0.04}
					durationSeconds={0.9}
					accentColor="var(--lagoon)"
				/>
				<p className="mb-8 max-w-2xl text-base text-(--sea-ink-soft) sm:text-lg">
					Resultados, tablas de posiciones y marcadores en vivo de todos tus
					torneos.
				</p>
				<div className="flex flex-wrap gap-3">
					{[
						{ to: "/tournaments", label: "Torneos" },
						{ to: "/matches", label: "Partidos" },
						{ to: "/teams", label: "Equipos" },
						{ to: "/clubs", label: "Clubes" },
					].map((l) => (
						<Link
							key={l.to}
							to={l.to}
							className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-(--lagoon-deep) no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
						>
							{l.label}
						</Link>
					))}
				</div>
			</section>

			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="demo-section-title">Torneos destacados</h2>
					<Link to="/tournaments" className="text-sm">
						Ver todos
					</Link>
				</div>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{tournaments.map((t) => (
						<Link
							key={t.id}
							to="/tournaments/$tournamentId"
							params={{ tournamentId: t.id }}
							className="no-underline"
						>
							<Card className="p-4 hover:border-(--lagoon-deep)">
								<CardHeader className="p-0">
									<CardTitle className="text-base">{t.name}</CardTitle>
								</CardHeader>
								<div className="mt-2">
									<Badge variant="outline">{t.sportId}</Badge>
								</div>
							</Card>
						</Link>
					))}
				</div>
				{tournaments.length === 0 && (
					<EmptyState
						title="Aún no hay torneos publicados"
						description="Vuelve más pronto: los torneos aparecen cuando se abren."
					/>
				)}
			</section>

			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="demo-section-title">En vivo ahora</h2>
					<Link to="/matches" className="text-sm">
						Ver fixture
					</Link>
				</div>
				{liveMatches.length > 0 ? (
					<AnimatedList
						items={liveMatches.map((m) => ({
							id: m.id,
							icon: <span className="h-2 w-2 rounded-full bg-(--lagoon)" />,
							title: `${m.homeTeam?.name ?? "Por definir"} vs ${
								m.awayTeam?.name ?? "Por definir"
							}`,
							description: MATCH_STATUS_LABELS[m.status] ?? m.status,
							meta: (
								<span className="inline-flex items-baseline gap-1 font-black text-(--sea-ink) tabular-nums">
									<CountUp to={m.homeScore} duration={1.2} />
									<span className="text-xs text-(--sea-ink-soft)">:</span>
									<CountUp to={m.awayScore} duration={1.2} />
								</span>
							),
						}))}
						onItemSelect={(item) => {
							if (typeof item === "object" && item && "id" in item) {
								void navigate({
									to: "/matches/$matchId",
									params: { matchId: String(item.id) },
								});
							}
						}}
						width="100%"
						maxHeight={400}
						animation="pop"
						stagger={0.06}
					/>
				) : (
					<EmptyState
						title="Sin partidos en vivo ahora"
						description="Cuando un partido esté en marcha, aparece aquí con su marcador en directo."
					/>
				)}
			</section>

			<section>
				<h2 className="demo-section-title mb-3">Resultados recientes</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					{recentMatches.map((m) => (
						<LiveMatchCard key={m.id} match={m} />
					))}
				</div>
				{recentMatches.length === 0 && (
					<EmptyState
						title="Aún no hay resultados"
						description="Cuando los partidos se jueguen, sus marcadores se listan aquí."
					/>
				)}
			</section>
		</main>
	);
}

function LiveMatchCard({ match: m }: { match: MatchWithTeams }) {
	return (
		<Link
			to="/matches/$matchId"
			params={{ matchId: m.id }}
			className="no-underline"
		>
			<Card className="p-4 hover:border-(--lagoon-deep)">
				<CardHeader className="p-0">
					<CardTitle className="text-sm">
						{m.homeTeam?.name ?? "Por definir"} vs{" "}
						{m.awayTeam?.name ?? "Por definir"}
					</CardTitle>
				</CardHeader>
				<div className="mt-1 flex gap-2">
					<Badge variant="outline">{m.status}</Badge>
					<Badge variant="outline" className="gap-1.5 tabular-nums">
						<CountUp to={m.homeScore} duration={1.1} />
						<span>:</span>
						<CountUp to={m.awayScore} duration={1.1} />
					</Badge>
				</div>
			</Card>
		</Link>
	);
}

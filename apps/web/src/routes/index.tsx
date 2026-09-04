import { queryKeys, unwrap } from "@sports/api-client";
import { Badge, Card, CardHeader, CardTitle } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../lib/api";

type TournamentItem = {
	id: string;
	name: string;
	sportId: string;
	description?: string | null;
};

type MatchItem = {
	id: string;
	status: string;
	homeScore: number;
	awayScore: number;
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
	component: HomePage,
});

function HomePage() {
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
	const liveMatches = (liveData as { items: MatchItem[]; total: number }).items;
	const recentMatches = (recentData as { items: MatchItem[]; total: number })
		.items;

	return (
		<main className="page-wrap space-y-8 px-4 pb-8 pt-6">
			<section className="island-shell rise-in relative overflow-hidden rounded-4xl px-6 py-10 sm:px-10 sm:py-14">
				<div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
				<div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
				<p className="island-kicker mb-3">Plataforma multideporte</p>
				<h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-(--sea-ink) sm:text-6xl">
					Sports Platform
				</h1>
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
					<div className="demo-card text-center text-sm">
						Aún no hay torneos publicados.
					</div>
				)}
			</section>

			<section>
				<div className="mb-3 flex items-center justify-between">
					<h2 className="demo-section-title">En vivo ahora</h2>
					<Link to="/matches" className="text-sm">
						Ver fixture
					</Link>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{liveMatches.map((m) => (
						<MatchCard key={m.id} match={m} live />
					))}
				</div>
				{liveMatches.length === 0 && (
					<div className="demo-card text-center text-sm">
						Sin partidos en vivo ahora.
					</div>
				)}
			</section>

			<section>
				<h2 className="demo-section-title mb-3">Resultados recientes</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					{recentMatches.map((m) => (
						<MatchCard key={m.id} match={m} />
					))}
				</div>
				{recentMatches.length === 0 && (
					<div className="demo-card text-center text-sm">
						Aún no hay resultados.
					</div>
				)}
			</section>
		</main>
	);
}

function MatchCard({
	match: m,
	live = false,
}: {
	match: MatchItem;
	live?: boolean;
}) {
	return (
		<Link
			to="/matches/$matchId"
			params={{ matchId: m.id }}
			className="no-underline"
		>
			<Card className="p-4 hover:border-(--lagoon-deep)">
				<CardHeader className="p-0">
					<CardTitle className="text-sm">Partido {m.id.slice(0, 8)}</CardTitle>
				</CardHeader>
				<div className="mt-1 flex gap-2">
					<Badge variant={live ? "success" : "secondary"}>{m.status}</Badge>
					<Badge variant="outline">
						{m.homeScore} : {m.awayScore}
					</Badge>
				</div>
			</Card>
		</Link>
	);
}

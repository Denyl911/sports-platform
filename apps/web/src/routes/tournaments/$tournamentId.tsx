import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@sports/ui";
import { TournamentHeader } from "@sports/ui";

export const Route = createFileRoute("/tournaments/$tournamentId")({
	loader: async ({ context, params }) => {
		const qc = (context as { queryClient: import("@tanstack/react-query").QueryClient }).queryClient;
		await qc.ensureQueryData({
			queryKey: queryKeys.tournaments.detail(params.tournamentId),
			queryFn: () => unwrap(api.tournaments({ tournamentId: params.tournamentId }).get()),
		});
		await qc.ensureQueryData({
			queryKey: queryKeys.editions.listByTournament(params.tournamentId),
			queryFn: () => unwrap(api.tournaments({ tournamentId: params.tournamentId }).editions.get()),
		});
	},
	component: TournamentDetailPage,
});

function TournamentDetailPage() {
	const { tournamentId } = Route.useParams();
	const { data: tournament } = useSuspenseQuery({
		queryKey: queryKeys.tournaments.detail(tournamentId),
		queryFn: () => unwrap(api.tournaments({ tournamentId }).get()),
	});
	const { data: editionsData } = useSuspenseQuery({
		queryKey: queryKeys.editions.listByTournament(tournamentId),
		queryFn: () => unwrap(api.tournaments({ tournamentId }).editions.get()),
	});

	const t = tournament as { id: string; name: string; sportId: string; description?: string | null };
	const editions = (editionsData as { items: Array<{ id: string; name: string; status: string; startDate?: string | null }>; total: number }).items;

	return (
		<div className="demo-page space-y-6">
			<TournamentHeader tournament={{ id: t.id, name: t.name, sportId: t.sportId }} />
			<p className="text-sm text-[var(--sea-ink-soft)]">{t.description ?? "Sin descripción"}</p>

			<div>
				<h2 className="demo-section-title mb-3">Ediciones</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					{editions.map((e) => (
						<Link key={e.id} to="/editions/$editionId" params={{ editionId: e.id }} className="no-underline">
							<Card className="p-4 hover:border-[var(--lagoon-deep)]">
								<CardHeader className="p-0 pb-2">
									<CardTitle className="text-base">{e.name}</CardTitle>
								</CardHeader>
								<CardContent className="p-0">
									<Badge variant="secondary">{e.status}</Badge>
									{e.startDate && <div className="mt-2 text-xs text-[var(--sea-ink-soft)]">{new Date(e.startDate).toLocaleDateString()}</div>}
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
				{editions.length === 0 && <div className="demo-card text-center text-sm">No hay ediciones.</div>}
			</div>
		</div>
	);
}

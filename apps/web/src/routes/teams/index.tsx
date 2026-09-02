import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { Card, CardHeader, CardTitle, Badge } from "@sports/ui";

export const Route = createFileRoute("/teams/")({
	loader: async ({ context }) => {
		const qc = (context as { queryClient: import("@tanstack/react-query").QueryClient }).queryClient;
		await qc.ensureQueryData({
			queryKey: queryKeys.teams.list(),
			queryFn: () => unwrap(api.teams.get({ query: {} as never })),
		});
	},
	component: TeamsPage,
});

function TeamsPage() {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.teams.list(),
		queryFn: () => unwrap(api.teams.get({ query: {} as never })),
	});
	const teams = (data as { items: Array<{ id: string; name: string; clubId: string; category?: string | null }>; total: number }).items;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">Equipos</h1>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{teams.map((t) => (
					<Link key={t.id} to="/teams/$teamId" params={{ teamId: t.id }} className="no-underline">
						<Card className="p-4 hover:border-[var(--lagoon-deep)]">
							<CardHeader className="p-0"><CardTitle className="text-base">{t.name}</CardTitle></CardHeader>
							<div className="mt-2 flex gap-2">
								<Badge variant="outline">{t.clubId.slice(0, 8)}</Badge>
								{t.category && <Badge>{t.category}</Badge>}
							</div>
						</Card>
					</Link>
				))}
			</div>
			{teams.length === 0 && <div className="demo-card text-center text-sm">No hay equipos.</div>}
		</div>
	);
}

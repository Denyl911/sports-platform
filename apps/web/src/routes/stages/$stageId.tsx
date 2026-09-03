import { queryKeys, unwrap } from "@sports/api-client";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/stages/$stageId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.groups.listByStage(params.stageId),
			queryFn: () =>
				unwrap(
					api.tournaments.stages({ stageId: params.stageId }).groups.get(),
				),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.matches.list({ stageId: params.stageId }),
			queryFn: () =>
				unwrap(
					api.matches.get({ query: { stageId: params.stageId } as never }),
				),
		});
	},
	component: StageDetailPage,
});

function StageDetailPage() {
	const { stageId } = Route.useParams();
	const { data: groupsData } = useSuspenseQuery({
		queryKey: queryKeys.groups.listByStage(stageId),
		queryFn: () => unwrap(api.tournaments.stages({ stageId }).groups.get()),
	});
	const { data: matchesData } = useSuspenseQuery({
		queryKey: queryKeys.matches.list({ stageId }),
		queryFn: () => unwrap(api.matches.get({ query: { stageId } as never })),
	});

	const groups = (
		groupsData as { items: Array<{ id: string; name: string }>; total: number }
	).items;
	const matches = (
		matchesData as {
			items: Array<{
				id: string;
				homeTeamId: string | null;
				awayTeamId: string | null;
				status: string;
				roundNumber?: number | null;
				homeScore?: number | null;
				awayScore?: number | null;
			}>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-6">
			<h1 className="demo-title">Etapa</h1>
			<div>
				<h2 className="demo-section-title mb-2">Grupos</h2>
				<div className="flex flex-wrap gap-2">
					{groups.map((g) => (
						<Link
							key={g.id}
							to="/groups/$groupId"
							params={{ groupId: g.id }}
							className="no-underline"
						>
							<Badge variant="secondary" className="px-3 py-1">
								{g.name}
							</Badge>
						</Link>
					))}
					{groups.length === 0 && (
						<span className="text-sm text-(--sea-ink-soft)">Sin grupos</span>
					)}
				</div>
			</div>
			<div>
				<h2 className="demo-section-title mb-2">Partidos</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					{matches.map((m) => (
						<Link
							key={m.id}
							to="/matches/$matchId"
							params={{ matchId: m.id }}
							className="no-underline"
						>
							<Card className="p-4">
								<CardHeader className="p-0">
									<CardTitle className="text-sm">{m.id.slice(0, 8)}</CardTitle>
								</CardHeader>
								<CardContent className="p-0">
									<Badge>{m.status}</Badge>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
				{matches.length === 0 && (
					<div className="demo-card text-center text-sm">Sin partidos.</div>
				)}
			</div>
		</div>
	);
}

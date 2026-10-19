import { queryKeys, unwrap } from "@sports/api-client";
import { useGroupLive } from "@sports/api-client/live";
import { Badge, DECORATIVE, Radio, StandingsTable } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api, getStoredAccessToken } from "../../lib/api";

export const Route = createFileRoute("/standings/$groupId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.standings.byGroup(params.groupId),
			queryFn: () =>
				unwrap(api.groups({ groupId: params.groupId }).standings.get()),
		});
	},
	head: () => ({
		meta: [
			{ title: "Tabla de posiciones — Sports Platform" },
			{
				name: "description",
				content: "Posiciones del grupo en vivo: PJ, PG, PE, PP y puntos.",
			},
		],
	}),
	component: StandingsPage,
});

function StandingsPage() {
	const { groupId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.standings.byGroup(groupId),
		queryFn: () => unwrap(api.groups({ groupId }).standings.get()),
	});
	const live = useGroupLive(groupId, {
		getToken: getStoredAccessToken,
		updateCache: true,
	});

	const standings = data as {
		items: Array<{
			standing: {
				id: string;
				rankPosition: number | null;
				played: number;
				won: number;
				drawn: number;
				lost: number;
				points: number;
				scoreFor: number;
				scoreAgainst: number;
				scoreDifference: number;
			};
			team: { id: string; name: string };
		}>;
		total: number;
	};
	const rows = standings.items.map(({ standing, team }) => ({
		id: standing.id,
		team: { id: team.id, name: team.name },
		played: standing.played,
		won: standing.won,
		drawn: standing.drawn,
		lost: standing.lost,
		points: standing.points,
		scoreFor: standing.scoreFor,
		scoreAgainst: standing.scoreAgainst,
		scoreDifference: standing.scoreDifference,
		rankPosition: standing.rankPosition,
	}));

	return (
		<div className="demo-page space-y-4">
			<div className="flex items-center gap-2">
				<h1 className="demo-title">Tabla</h1>
				<Badge
					variant={live.isOpen ? "success" : "secondary"}
					className="gap-1.5"
				>
					<Radio {...DECORATIVE} className="size-3.5" />
					{live.status}
				</Badge>
			</div>
			<StandingsTable rows={rows} />
			{live.lastError && (
				<div className="demo-alert-danger text-sm">
					{live.lastError.message}
				</div>
			)}
		</div>
	);
}

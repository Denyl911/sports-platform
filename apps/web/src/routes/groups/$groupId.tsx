import { queryKeys, unwrap } from "@sports/api-client";
import { StandingsTable } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/groups/$groupId")({
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
	component: GroupDetailPage,
});

function GroupDetailPage() {
	const { groupId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.standings.byGroup(groupId),
		queryFn: () => unwrap(api.groups({ groupId }).standings.get()),
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
		<div className="demo-page space-y-6">
			<h1 className="demo-title">Grupo</h1>
			<StandingsTable
				rows={rows}
				caption={`Posiciones — ${rows.length} equipos`}
			/>
		</div>
	);
}

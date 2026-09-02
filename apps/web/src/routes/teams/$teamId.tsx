import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { Card, Badge } from "@sports/ui";

export const Route = createFileRoute("/teams/$teamId")({
	loader: async ({ context, params }) => {
		const qc = (context as { queryClient: import("@tanstack/react-query").QueryClient }).queryClient;
		await qc.ensureQueryData({
			queryKey: queryKeys.teams.detail(params.teamId),
			queryFn: () => unwrap(api.teams({ id: params.teamId }).get()),
		});
	},
	component: TeamDetailPage,
});

function TeamDetailPage() {
	const { teamId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.teams.detail(teamId),
		queryFn: () => unwrap(api.teams({ id: teamId }).get()),
	});
	const team = data as { id: string; name: string; clubId: string; category?: string | null };

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">{team.name}</h1>
			<Card className="p-4">
				<div className="flex gap-2">
					<Badge variant="outline">Club {team.clubId.slice(0, 8)}</Badge>
					{team.category && <Badge>{team.category}</Badge>}
				</div>
				<p className="mt-2 text-sm text-[var(--sea-ink-soft)]">ID: {team.id}</p>
			</Card>
		</div>
	);
}

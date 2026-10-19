import { queryKeys, unwrap } from "@sports/api-client";
import { Badge, Building2, Card, DECORATIVE } from "@sports/ui";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/teams/$teamId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		const team = await qc.query({
			staleTime: "static",
			queryKey: queryKeys.teams.detail(params.teamId),
			queryFn: () => unwrap(api.teams({ id: params.teamId }).get()),
		});
		// El club es opcional: se precarga solo si el equipo tiene uno.
		const clubId = (team as { clubId?: string | null } | undefined)?.clubId;
		if (clubId) {
			await qc.query({
				staleTime: "static",
				queryKey: queryKeys.clubs.detail(clubId),
				queryFn: () => unwrap(api.clubs({ id: clubId }).get()),
			});
		}
		return team;
	},
	head: ({ loaderData }) => {
		const t = loaderData as { name?: string } | undefined;
		return {
			meta: [
				{ title: `${t?.name ?? "Equipo"} — Sports Platform` },
				{
					name: "description",
					content: "Partidos y estadísticas del equipo en Sports Platform.",
				},
			],
		};
	},
	component: TeamDetailPage,
});

function TeamDetailPage() {
	const { teamId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.teams.detail(teamId),
		queryFn: () => unwrap(api.teams({ id: teamId }).get()),
	});
	const team = data as {
		id: string;
		name: string;
		clubId: string | null;
		category?: string | null;
	};
	// El club se precargó en el loader cuando existe: acá se lee de cache.
	const { data: clubData } = useQuery({
		queryKey: queryKeys.clubs.detail(team.clubId ?? ""),
		queryFn: () => unwrap(api.clubs({ id: team.clubId as string }).get()),
		enabled: !!team.clubId,
	});
	const club = clubData as { id: string; name: string } | undefined;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">{team.name}</h1>
			<Card className="p-4">
				<div className="flex gap-2">
					<Badge variant="outline" className="gap-1.5">
						<Building2 {...DECORATIVE} className="size-3.5" />
						{team.clubId ? (club?.name ?? "Club") : "Sin club"}
					</Badge>
					{team.category && <Badge>{team.category}</Badge>}
				</div>
				<p className="mt-2 text-sm text-(--sea-ink-soft)">ID: {team.id}</p>
			</Card>
		</div>
	);
}

import { queryKeys, unwrap } from "@sports/api-client";
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Select,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/editions/$editionId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.stages.listByEdition(params.editionId),
			queryFn: () =>
				unwrap(
					api.tournaments
						.editions({ editionId: params.editionId })
						.stages.get(),
				),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.teams.list(),
			queryFn: () => unwrap(api.teams.get({ query: {} })),
		});
	},
	head: () => ({
		meta: [
			{ title: "Edición del torneo — Sports Platform" },
			{
				name: "description",
				content: "Etapas y equipos de esta edición del torneo.",
			},
		],
	}),
	component: EditionDetailPage,
});

function EditionDetailPage() {
	const { editionId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.stages.listByEdition(editionId),
		queryFn: () => unwrap(api.tournaments.editions({ editionId }).stages.get()),
	});

	const stages = (
		data as {
			items: Array<{
				id: string;
				name: string;
				stageType: string;
				sequenceOrder: number;
			}>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-6">
			<h1 className="demo-title">Etapas</h1>
			<div className="grid gap-3 sm:grid-cols-2">
				{stages.map((s) => (
					<Link
						key={s.id}
						to="/stages/$stageId"
						params={{ stageId: s.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="p-0">
								<CardTitle className="text-base">{s.name}</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								<div className="flex gap-2 mt-2">
									<Badge variant="outline">{s.stageType}</Badge>
									<Badge variant="secondary">#{s.sequenceOrder}</Badge>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
			{stages.length === 0 && (
				<div className="demo-card text-center text-sm">No hay etapas.</div>
			)}

			<RosterSection editionId={editionId} />
		</div>
	);
}

function RosterSection({ editionId }: { editionId: string }) {
	const { data: teamsData } = useSuspenseQuery({
		queryKey: queryKeys.teams.list(),
		queryFn: () => unwrap(api.teams.get({ query: {} })),
	});
	const teams = (
		teamsData as {
			items: Array<{ id: string; name: string }>;
			total: number;
		}
	).items;

	const [teamId, setTeamId] = React.useState("");
	React.useEffect(() => {
		if (teams.length && !teams.some((t) => t.id === teamId)) {
			setTeamId(teams[0]!.id);
		}
	}, [teams, teamId]);

	return (
		<div>
			<h2 className="demo-section-title mb-2">Plantel</h2>
			{teams.length === 0 ? (
				<div className="demo-card text-center text-sm">No hay equipos.</div>
			) : (
				<>
					<Select
						value={teamId}
						onChange={(e) => setTeamId(e.target.value)}
						className="max-w-sm"
					>
						{teams.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</Select>
					{teamId && <RosterList editionId={editionId} teamId={teamId} />}
				</>
			)}
		</div>
	);
}

function RosterList({
	editionId,
	teamId,
}: {
	editionId: string;
	teamId: string;
}) {
	const { data: rosterData } = useSuspenseQuery({
		queryKey: queryKeys.rosters.byEditionTeam(editionId, teamId),
		queryFn: () =>
			unwrap(api.editions({ editionId }).teams({ teamId }).roster.get()),
	});
	const roster = (
		rosterData as {
			items: Array<{
				roster: {
					id: string;
					jerseyNumber?: number | null;
					position?: string | null;
					isCaptain?: boolean | null;
				};
				player: { id: string; firstName: string; lastName: string };
			}>;
			total: number;
		}
	).items;

	if (roster.length === 0) {
		return (
			<div className="demo-card mt-2 text-center text-sm">Plantel vacío.</div>
		);
	}

	return (
		<Card className="mt-2 p-4">
			<div className="space-y-1">
				{roster.map(({ roster: r, player }) => (
					<div
						key={r.id}
						className="demo-list-item flex items-center justify-between gap-2 text-sm"
					>
						<Link
							to="/players/$playerId"
							params={{ playerId: player.id }}
							className="no-underline font-semibold"
						>
							{player.firstName} {player.lastName}
						</Link>
						<span className="flex gap-1">
							{r.jerseyNumber != null && (
								<Badge variant="outline">#{r.jerseyNumber}</Badge>
							)}
							{r.position && <Badge variant="secondary">{r.position}</Badge>}
							{r.isCaptain && <Badge>capitán</Badge>}
						</span>
					</div>
				))}
			</div>
		</Card>
	);
}

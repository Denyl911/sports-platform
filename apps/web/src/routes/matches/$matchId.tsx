import { type MatchDetail, queryKeys, unwrap } from "@sports/api-client";
import { useGroupLive, useMatchLive } from "@sports/api-client/live";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	MatchCard,
	StandingsTable,
	VenuePill,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { api, getStoredAccessToken } from "../../lib/api";

export const Route = createFileRoute("/matches/$matchId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.matches.detail(params.matchId),
			queryFn: () => unwrap(api.matches({ id: params.matchId }).get()),
		});
	},
	component: MatchDetailPage,
});

function MatchDetailPage() {
	const { matchId } = Route.useParams();
	const { data: matchData } = useSuspenseQuery({
		queryKey: queryKeys.matches.detail(matchId),
		queryFn: () => unwrap(api.matches({ id: matchId }).get()),
	});
	const match = matchData as MatchDetail;

	const live = useMatchLive(matchId, {
		getToken: getStoredAccessToken,
		updateCache: true,
	});
	const groupLive = useGroupLive(match.groupId ?? "", {
		enabled: !!match.groupId,
		getToken: getStoredAccessToken,
		updateCache: true,
	});

	const [homeScore, setHomeScore] = React.useState(match.homeScore);
	const [awayScore, setAwayScore] = React.useState(match.awayScore);

	React.useEffect(() => {
		setHomeScore(match.homeScore);
		setAwayScore(match.awayScore);
	}, [match.homeScore, match.awayScore]);

	const handleSendScore = () => {
		live.sendScore({ homeScore, awayScore, status: "in_progress" });
	};

	return (
		<div className="demo-page space-y-6">
			<MatchCard
				homeTeam={{
					id: match.homeTeam?.id ?? match.homeTeamId ?? "home",
					name: match.homeTeam?.name ?? "Por definir",
				}}
				awayTeam={{
					id: match.awayTeam?.id ?? match.awayTeamId ?? "away",
					name: match.awayTeam?.name ?? "Por definir",
				}}
				homeScore={match.homeScore}
				awayScore={match.awayScore}
				status={match.status}
				scheduledAt={match.scheduledAt}
				live={live.isOpen}
				roundLabel={live.status}
			/>
			{match.venue && (
				<VenuePill name={match.venue.name} address={match.venue.address} />
			)}

			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle className="text-base">Live WS</CardTitle>
				</CardHeader>
				<CardContent className="p-0 space-y-2">
					<div className="flex items-center gap-2 text-sm">
						<Badge variant={live.isOpen ? "success" : "secondary"}>
							{live.status}
						</Badge>
						<span className="text-(--sea-ink-soft)">
							{live.lastMessage
								? JSON.stringify(live.lastMessage).slice(0, 120)
								: "sin mensajes"}
						</span>
					</div>
					{match.groupId && (
						<div className="text-xs text-(--sea-ink-soft)">
							Group live: {groupLive.status}{" "}
							{groupLive.lastStanding ? "· standing updated" : ""}
						</div>
					)}
					<div className="flex gap-2">
						<input
							type="number"
							value={homeScore}
							onChange={(e) => setHomeScore(Number(e.target.value))}
							className="demo-input w-20"
						/>
						<input
							type="number"
							value={awayScore}
							onChange={(e) => setAwayScore(Number(e.target.value))}
							className="demo-input w-20"
						/>
						<Button onClick={handleSendScore} disabled={!live.isOpen}>
							Enviar score
						</Button>
					</div>
					{live.lastError && (
						<div className="demo-alert-danger text-sm">
							{live.lastError.message}
						</div>
					)}
				</CardContent>
			</Card>

			{match.groupId && <GroupStandingsInline groupId={match.groupId} />}
		</div>
	);
}

function GroupStandingsInline({ groupId }: { groupId: string }) {
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
	return <StandingsTable rows={rows} caption="Posiciones del grupo" />;
}

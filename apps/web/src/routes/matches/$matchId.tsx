import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { api, getStoredAccessToken } from "../../lib/api";
import { queryKeys } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { useMatchLive, useGroupLive } from "@sports/api-client/live";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, VenuePill } from "@sports/ui";
import { MatchCard, StandingsTable } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/matches/$matchId")({
	loader: async ({ context, params }) => {
		const qc = (context as { queryClient: import("@tanstack/react-query").QueryClient }).queryClient;
		await qc.ensureQueryData({
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
	const match = matchData as {
		id: string;
		stageId: string;
		groupId: string | null;
		homeTeamId: string | null;
		awayTeamId: string | null;
		homeScore: number;
		awayScore: number;
		status: "scheduled" | "in_progress" | "paused" | "finished" | "cancelled" | "walkover";
		scheduledAt: string | null;
		venueId: string | null;
	};
	const { data: venueData } = useQuery({
		queryKey: match.venueId ? queryKeys.venues.detail(match.venueId) : ["venues", "none"],
		queryFn: () => unwrap(api.venues({ id: match.venueId! }).get()),
		enabled: !!match.venueId,
	});
	const venue = venueData as { name: string; address?: string | null } | undefined;

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
				homeTeam={{ id: match.homeTeamId ?? "home", name: match.homeTeamId?.slice(0, 8) ?? "Local" }}
				awayTeam={{ id: match.awayTeamId ?? "away", name: match.awayTeamId?.slice(0, 8) ?? "Visitante" }}
				homeScore={match.homeScore}
				awayScore={match.awayScore}
				status={match.status}
				scheduledAt={match.scheduledAt}
				live={live.isOpen}
				roundLabel={live.status}
			/>
			{venue && <VenuePill name={venue.name} address={venue.address} />}

			<Card className="p-4">
				<CardHeader className="p-0 pb-2"><CardTitle className="text-base">Live WS</CardTitle></CardHeader>
				<CardContent className="p-0 space-y-2">
					<div className="flex items-center gap-2 text-sm">
						<Badge variant={live.isOpen ? "success" : "secondary"}>{live.status}</Badge>
						<span className="text-[var(--sea-ink-soft)]">{live.lastMessage ? JSON.stringify(live.lastMessage).slice(0, 120) : "sin mensajes"}</span>
					</div>
					{match.groupId && (
						<div className="text-xs text-[var(--sea-ink-soft)]">Group live: {groupLive.status} {groupLive.lastStanding ? "· standing updated" : ""}</div>
					)}
					<div className="flex gap-2">
						<input type="number" value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} className="demo-input w-20" />
						<input type="number" value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} className="demo-input w-20" />
						<Button onClick={handleSendScore} disabled={!live.isOpen}>Enviar score</Button>
					</div>
					{live.lastError && <div className="demo-alert-danger text-sm">{live.lastError.message}</div>}
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
	const standings = data as { items: Array<{ standing: { id: string; rankPosition: number | null; played: number; won: number; drawn: number; lost: number; points: number; scoreFor: number; scoreAgainst: number; scoreDifference: number }; team: { id: string; name: string } }>; total: number };
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

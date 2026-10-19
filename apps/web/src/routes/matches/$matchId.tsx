import { type MatchDetail, queryKeys, unwrap } from "@sports/api-client";
import { useGroupLive, useMatchLive } from "@sports/api-client/live";
import {
	Card,
	CardHeader,
	CardTitle,
	EmptyState,
	StandingsTable,
	VenuePill,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
	AnimatedScore,
	LiveBadge,
	MATCH_STATUS_LABELS,
	MatchTimeline,
} from "../../components/live-ui";
import { api, getStoredAccessToken } from "../../lib/api";

export const Route = createFileRoute("/matches/$matchId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		const match = await qc.query({
			staleTime: "static",
			queryKey: queryKeys.matches.detail(params.matchId),
			queryFn: () => unwrap(api.matches({ id: params.matchId }).get()),
		});
		return match;
	},
	// Título con los nombres reales: Fase 1.1 puso los equipos en el contrato.
	head: ({ loaderData }) => {
		const m = loaderData as MatchDetail | undefined;
		const home = m?.homeTeam?.name ?? "Por definir";
		const away = m?.awayTeam?.name ?? "Por definir";
		return {
			meta: [
				{ title: `${home} vs ${away} — Sports Platform` },
				{
					name: "description",
					content:
						"Marcador en vivo, eventos y tabla del partido en Sports Platform.",
				},
			],
		};
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

	// Un solo socket por página; `updateCache` actualiza el marcador en cache
	// y las tablas revalidan solas (standingKeys invalidadas por el hook).
	const live = useMatchLive(matchId, {
		getToken: getStoredAccessToken,
		updateCache: true,
	});
	useGroupLive(match.groupId ?? "", {
		enabled: !!match.groupId,
		getToken: getStoredAccessToken,
		updateCache: true,
	});

	const teams = React.useMemo(
		() =>
			[
				...(match.homeTeam ? [match.homeTeam] : []),
				...(match.awayTeam ? [match.awayTeam] : []),
			].map(({ id, name }) => ({ id, name })),
		[match.homeTeam, match.awayTeam],
	);

	return (
		<div className="demo-page space-y-6">
			{/* Hero en vivo: equipos, marcador que late al anotar, insignia honesta. */}
			<Card className="relative overflow-hidden p-5 sm:p-6">
				<div className="mb-3 flex items-center justify-between gap-3">
					<span className="text-xs font-bold uppercase tracking-widest text-(--kicker)">
						{match.groupId ? "Fase de grupos" : "Partido"}
					</span>
					<LiveBadge status={live.status} matchStatus={match.status} />
				</div>
				<div className="flex items-center justify-between gap-4">
					<HeroTeam name={match.homeTeam?.name} />
					<div className="flex flex-col items-center gap-2">
						<AnimatedScore
							homeScore={match.homeScore ?? 0}
							awayScore={match.awayScore ?? 0}
						/>
						<span className="text-xs font-bold text-(--sea-ink-soft)">
							{MATCH_STATUS_LABELS[match.status]} · minuto{" "}
							{match.events.at(-1)?.minuteOrSecond != null
								? `${match.events.at(-1)!.minuteOrSecond}'`
								: "—"}
						</span>
					</div>
					<HeroTeam name={match.awayTeam?.name} />
				</div>
			</Card>
			{match.venue && (
				<VenuePill name={match.venue.name} address={match.venue.address} />
			)}

			<Card className="p-4">
				<CardHeader className="p-0 pb-3">
					<CardTitle className="text-base">Cronología</CardTitle>
				</CardHeader>
				{match.events.length === 0 ? (
					<EmptyState
						title="Sin eventos todavía"
						description="Cada gol, tarjeta o cambio que se registre aparece aquí al momento."
					/>
				) : (
					<MatchTimeline events={match.events} teams={teams} />
				)}
			</Card>

			{match.groupId && <GroupStandingsInline groupId={match.groupId} />}
		</div>
	);
}

function HeroTeam({ name }: { name?: string | null }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
			<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-(--line) bg-(--chip-bg) text-sm font-black sm:h-14 sm:w-14">
				{(name ?? "?").slice(0, 2).toUpperCase()}
			</div>
			<span className="truncate text-sm font-bold text-(--sea-ink) sm:text-base">
				{name ?? "Por definir"}
			</span>
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

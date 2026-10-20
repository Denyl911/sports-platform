import type { StageFixture } from "@sports/api-client";
import {
	Badge,
	CalendarClock,
	Card,
	DECORATIVE,
	EmptyState,
	MapPin,
	Radio,
	Swords,
	Table2,
} from "@sports/ui";
import { Link } from "@tanstack/react-router";
import {
	formatDay,
	formatTime,
	groupByMatchday,
	matchdayDateLabel,
	toDate,
} from "../lib/fixture-date";
import {
	MATCH_STATUS_LABELS,
	type MatchStatusLike,
	matchStatusBadgeVariant,
} from "./live-ui";

type FixtureItem = StageFixture["items"][number];
type GroupOption = { id: string; name: string };

/**
 * Fixture público de una etapa, agrupado por jornada. La API ya entrega el
 * fixture completo y ordenado; acá solo se agrupa y se muestra la fecha local,
 * la sede y la cancha. Los partidos de llave siguen teniendo su bracket aparte.
 */
export function PublicFixture({
	items,
	groups,
	roundLabel = "Jornada",
}: {
	items: FixtureItem[];
	groups: GroupOption[];
	roundLabel?: string;
}) {
	const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
	const matchdays = groupByMatchday(items);

	if (items.length === 0) {
		return (
			<EmptyState
				icon={Swords}
				title="Sin partidos"
				description="El fixture de esta etapa todavía no está programado."
			/>
		);
	}

	return (
		<div className="space-y-5">
			{matchdays.map((matchday) => (
				<section key={matchday.roundNumber} className="space-y-3">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="text-sm font-bold">
							{roundLabel} {matchday.roundNumber}
						</h3>
						<span
							className="text-xs text-(--sea-ink-soft)"
							suppressHydrationWarning
						>
							{matchdayDateLabel(matchday.items)}
						</span>
						<Badge variant="outline">{matchday.items.length} partidos</Badge>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						{matchday.items.map((match) => (
							<PublicMatchCard
								key={match.id}
								match={match}
								groupName={
									match.groupId
										? (groupNameById.get(match.groupId) ?? null)
										: null
								}
							/>
						))}
					</div>
				</section>
			))}
		</div>
	);
}

function PublicMatchCard({
	match,
	groupName,
}: {
	match: FixtureItem;
	groupName: string | null;
}) {
	const status = match.status as MatchStatusLike;
	const showScore = status !== "scheduled" && status !== "cancelled";
	const date = toDate(match.scheduledAt);

	return (
		<Link
			to="/matches/$matchId"
			params={{ matchId: match.id }}
			className="no-underline"
		>
			<Card className="h-full p-4 hover:border-(--lagoon-deep)">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<span className="inline-flex items-center gap-1.5 text-xs font-bold text-(--sea-ink-soft)">
						<CalendarClock {...DECORATIVE} className="size-3.5 shrink-0" />
						{date ? (
							<time dateTime={date.toISOString()} suppressHydrationWarning>
								{formatDay(date)} · {formatTime(date)}
							</time>
						) : (
							"Sin programar"
						)}
					</span>
					<Badge variant={matchStatusBadgeVariant(status)} className="gap-1">
						{status === "in_progress" && (
							<Radio {...DECORATIVE} className="size-3.5 animate-pulse" />
						)}
						{MATCH_STATUS_LABELS[status]}
					</Badge>
				</div>

				<div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
					<span className="truncate text-sm font-bold">
						{match.homeTeam?.name ?? "Por definir"}
					</span>
					<span className="text-lg font-black tabular-nums text-(--sea-ink)">
						{showScore ? `${match.homeScore} : ${match.awayScore}` : "vs"}
					</span>
					<span className="truncate text-right text-sm font-bold">
						{match.awayTeam?.name ?? "Por definir"}
					</span>
				</div>

				<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-(--sea-ink-soft)">
					{groupName && (
						<Badge variant="secondary" className="gap-1">
							<Table2 {...DECORATIVE} className="size-3.5" />
							{groupName}
						</Badge>
					)}
					{match.venue ? (
						<span className="inline-flex items-center gap-1">
							<MapPin {...DECORATIVE} className="size-3.5 shrink-0" />
							{match.venue.name}
							{match.fieldNumber ? ` · Cancha ${match.fieldNumber}` : ""}
						</span>
					) : (
						<span>Sin sede</span>
					)}
				</div>
			</Card>
		</Link>
	);
}

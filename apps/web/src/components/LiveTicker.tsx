import { type MatchWithTeams, queryKeys, unwrap } from "@sports/api-client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../lib/api";

/**
 * Ticker de marcadores en vivo: cinta bajo el Header con los partidos
 * in_progress. Misma query key que la home (status= in_progress), así cache
 * se comparte entre Header y página. Sin WS global (la API hace fanout por
 * partido), así que refresca por sondeo de 30 s solo en pestaña visible.
 */
const TICKER_QUERY = { status: "in_progress", limit: 8 } as const;

export default function LiveTicker() {
	const { data } = useQuery({
		queryKey: queryKeys.matches.list({ ...TICKER_QUERY }),
		queryFn: () => unwrap(api.matches.get({ query: { ...TICKER_QUERY } })),
		staleTime: 10_000,
		refetchInterval: 30_000,
	});

	const items = (data as { items?: MatchWithTeams[] } | undefined)?.items;
	if (!items?.length) return null;

	return (
		<section className="live-ticker" aria-label="Marcadores en vivo">
			<div className="ticker-track">
				<TickerCopy items={items} />
				{/* Copia doble para el loop sin costura: fuera del foco y del
				    lector, invisible bajo movimiento reducido. */}
				<TickerCopy items={items} dup />
			</div>
		</section>
	);
}

function TickerCopy({
	items,
	dup = false,
}: {
	items: MatchWithTeams[];
	dup?: boolean;
}) {
	if (dup) {
		return (
			<span className="ticker-dup flex" aria-hidden="true">
				{items.map((m) => (
					<TickerEntry key={m.id} match={m} />
				))}
			</span>
		);
	}
	return (
		<span className="flex">
			{items.map((m) => (
				<Link
					key={m.id}
					to="/matches/$matchId"
					params={{ matchId: m.id }}
					className="no-underline"
				>
					<TickerEntry match={m} />
				</Link>
			))}
		</span>
	);
}

function TickerEntry({ match: m }: { match: MatchWithTeams }) {
	return (
		<span className="flex items-center gap-2 pr-8 text-xs whitespace-nowrap">
			<span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-(--lagoon)" />
			<span className="text-(--sea-ink-soft)">
				{m.homeTeam?.name ?? "Por definir"}
			</span>
			<strong className="font-black tabular-nums text-(--sea-ink)">
				{m.homeScore} : {m.awayScore}
			</strong>
			<span className="text-(--sea-ink-soft)">
				{m.awayTeam?.name ?? "Por definir"}
			</span>
		</span>
	);
}

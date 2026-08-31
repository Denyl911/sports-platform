import * as React from "react";
import { cn } from "../../lib/utils";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";

export interface BracketMatch {
	id: string;
	roundLabel: string;
	homeTeam?: { name: string } | null;
	awayTeam?: { name: string } | null;
	homeScore?: number | null;
	awayScore?: number | null;
	status: string;
	winnerTeamId?: string | null;
	nextMatchId?: string | null;
}

export interface BracketProps extends React.HTMLAttributes<HTMLDivElement> {
	matches: BracketMatch[];
	onMatchClick?: (match: BracketMatch) => void;
}

export function Bracket({ matches, onMatchClick, className, ...props }: BracketProps) {
	const rounds = React.useMemo(() => {
		const map = new Map<string, BracketMatch[]>();
		for (const m of matches) {
			const arr = map.get(m.roundLabel) ?? [];
			arr.push(m);
			map.set(m.roundLabel, arr);
		}
		return Array.from(map.entries());
	}, [matches]);

	if (!matches.length) {
		return <div className={cn("p-6 text-center text-sm text-[var(--sea-ink-soft)]", className)}>Sin cruces aún.</div>;
	}

	return (
		<div className={cn("flex gap-4 overflow-x-auto pb-4", className)} {...props}>
			{rounds.map(([round, ms]) => (
				<div key={round} className="min-w-[260px] flex-1">
					<div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--kicker)]">{round}</div>
					<div className="flex flex-col gap-3">
						{ms.map((m) => (
							<Card
								key={m.id}
								onClick={() => onMatchClick?.(m)}
								className={cn("p-3", onMatchClick && "cursor-pointer hover:border-[var(--lagoon-deep)]")}
							>
								<div className="flex items-center justify-between gap-2 text-sm">
									<span className={cn("truncate font-semibold", m.winnerTeamId && m.homeTeam && "opacity-60")}>
										{m.homeTeam?.name ?? "—"}
									</span>
									<span className="font-black">{m.homeScore ?? "–"}</span>
								</div>
								<div className="my-1 h-px bg-[var(--line)]" />
								<div className="flex items-center justify-between gap-2 text-sm">
									<span className={cn("truncate font-semibold", m.winnerTeamId && m.awayTeam && "opacity-60")}>
										{m.awayTeam?.name ?? "—"}
									</span>
									<span className="font-black">{m.awayScore ?? "–"}</span>
								</div>
								<div className="mt-2 flex items-center justify-between">
									<Badge variant={m.status === "finished" ? "secondary" : m.status === "in_progress" ? "success" : "outline"}>{m.status}</Badge>
									{m.winnerTeamId && <span className="text-xs text-[var(--palm)]">✓</span>}
								</div>
							</Card>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

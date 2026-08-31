import * as React from "react";
import { cn } from "../../lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";

export interface StandingRow {
	id: string;
	team: { id: string; name: string; logo?: string | null };
	played: number;
	won: number;
	drawn: number;
	lost: number;
	points: number;
	scoreFor: number;
	scoreAgainst: number;
	scoreDifference: number;
	bonusPoints?: number;
	rankPosition?: number | null;
}

export interface StandingsTableProps extends React.HTMLAttributes<HTMLDivElement> {
	rows: StandingRow[];
	caption?: string;
	highlightTeamIds?: string[];
}

export function StandingsTable({ rows, caption, highlightTeamIds, className, ...props }: StandingsTableProps) {
	if (!rows.length) {
		return (
			<div className={cn("rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--sea-ink-soft)]", className)} {...props}>
				No hay posiciones aún.
			</div>
		);
	}
	return (
		<div className={cn("w-full", className)} {...props}>
			{caption && <div className="mb-2 text-sm font-bold text-[var(--sea-ink)]">{caption}</div>}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10">#</TableHead>
						<TableHead>Equipo</TableHead>
						<TableHead className="text-center">PJ</TableHead>
						<TableHead className="text-center">G</TableHead>
						<TableHead className="text-center">E</TableHead>
						<TableHead className="text-center">P</TableHead>
						<TableHead className="text-center">GF</TableHead>
						<TableHead className="text-center">GC</TableHead>
						<TableHead className="text-center">DG</TableHead>
						<TableHead className="text-center">Pts</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{rows
						.slice()
						.sort((a, b) => (a.rankPosition ?? 999) - (b.rankPosition ?? 999))
						.map((r) => {
							const isHighlight = highlightTeamIds?.includes(r.team.id);
							return (
								<TableRow key={r.id} className={cn(isHighlight && "bg-[color-mix(in_oklab,var(--lagoon)_10%,transparent)]")}>
									<TableCell className="font-bold">
										{r.rankPosition ?? "—"}
										{isHighlight && <Badge variant="success" className="ml-2">Tú</Badge>}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--chip-bg)] text-[10px] font-black">
												{r.team.name.slice(0, 2).toUpperCase()}
											</span>
											<span className="font-semibold">{r.team.name}</span>
										</div>
									</TableCell>
									<TableCell className="text-center">{r.played}</TableCell>
									<TableCell className="text-center">{r.won}</TableCell>
									<TableCell className="text-center">{r.drawn}</TableCell>
									<TableCell className="text-center">{r.lost}</TableCell>
									<TableCell className="text-center">{r.scoreFor}</TableCell>
									<TableCell className="text-center">{r.scoreAgainst}</TableCell>
									<TableCell className="text-center font-bold">{r.scoreDifference}</TableCell>
									<TableCell className="text-center font-black">{r.points}</TableCell>
								</TableRow>
							);
						})}
				</TableBody>
			</Table>
		</div>
	);
}

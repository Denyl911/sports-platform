import * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";

export interface TournamentHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	tournament: { id: string; name: string; sportId?: string; sportName?: string };
	edition?: { id: string; name: string; status?: string; startDate?: string | null; endDate?: string | null } | null;
	stage?: { id: string; name: string; stageType?: string; sequenceOrder?: number } | null;
	group?: { id: string; name: string } | null;
}

export function TournamentHeader({ tournament, edition, stage, group, className, ...props }: TournamentHeaderProps) {
	return (
		<div className={cn("rounded-2xl border border-[var(--line)] bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] p-4 backdrop-blur-[4px]", className)} {...props}>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<Badge variant="secondary">{tournament.sportName ?? tournament.sportId ?? "Deporte"}</Badge>
				{edition && <Badge variant="outline">{edition.status ?? "edición"}</Badge>}
				{stage && <Badge>{stage.name}</Badge>}
				{group && <Badge variant="success">{group.name}</Badge>}
			</div>
			<h2 className="mt-2 text-lg font-black leading-tight text-[var(--sea-ink)]">{tournament.name}</h2>
			{edition && (
				<p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
					{edition.name} {edition.startDate && `· ${new Date(edition.startDate).toLocaleDateString()}`}
					{edition.endDate && ` – ${new Date(edition.endDate).toLocaleDateString()}`}
				</p>
			)}
			{stage && (
				<p className="text-xs text-[var(--sea-ink-soft)]">
					Etapa {stage.sequenceOrder ?? "—"}: {stage.name} {stage.stageType && `· ${stage.stageType}`}
				</p>
			)}
		</div>
	);
}

export function VenuePill({ name, address, className, ...props }: { name: string; address?: string | null } & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div className={cn("inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-bold text-[var(--sea-ink-soft)]", className)} {...props}>
			<span>📍</span>
			<span>{name}</span>
			{address && <span className="hidden sm:inline opacity-60">· {address}</span>}
		</div>
	);
}

export function SportIcon({ sportId, className, ...props }: { sportId: string } & React.HTMLAttributes<HTMLDivElement>) {
	const emoji: Record<string, string> = {
		football: "⚽",
		basketball: "🏀",
		volleyball: "🏐",
		tennis: "🎾",
		baseball: "⚾",
	};
	return (
		<div className={cn("flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--chip-bg)] text-sm", className)} {...props}>
			{emoji[sportId] ?? "🏅"}
		</div>
	);
}

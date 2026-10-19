import type * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import {
	CalendarDays,
	DECORATIVE,
	Dumbbell,
	Layers,
	MapPin,
	Table2,
} from "../ui/icon";

export interface TournamentHeaderProps
	extends React.HTMLAttributes<HTMLDivElement> {
	tournament: {
		id: string;
		name: string;
		sportId?: string;
		sportName?: string;
	};
	edition?: {
		id: string;
		name: string;
		status?: string;
		startDate?: string | null;
		endDate?: string | null;
	} | null;
	stage?: {
		id: string;
		name: string;
		stageType?: string;
		sequenceOrder?: number;
	} | null;
	group?: { id: string; name: string } | null;
}

export function TournamentHeader({
	tournament,
	edition,
	stage,
	group,
	className,
	...props
}: TournamentHeaderProps) {
	return (
		<div
			className={cn(
				"rounded-2xl border border-(--line) bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] p-4 backdrop-blur-xs",
				className,
			)}
			{...props}
		>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<Badge variant="secondary" className="gap-1">
					<Dumbbell {...DECORATIVE} className="size-3.5" />
					{tournament.sportName ?? tournament.sportId ?? "Deporte"}
				</Badge>
				{edition && (
					<Badge variant="outline" className="gap-1">
						<CalendarDays {...DECORATIVE} className="size-3.5" />
						{edition.status ?? "edición"}
					</Badge>
				)}
				{stage && (
					<Badge className="gap-1">
						<Layers {...DECORATIVE} className="size-3.5" />
						{stage.name}
					</Badge>
				)}
				{group && (
					<Badge variant="success" className="gap-1">
						<Table2 {...DECORATIVE} className="size-3.5" />
						{group.name}
					</Badge>
				)}
			</div>
			<h2 className="mt-2 text-lg font-black leading-tight text-(--sea-ink)">
				{tournament.name}
			</h2>
			{edition && (
				<p className="mt-1 text-sm text-(--sea-ink-soft)">
					<span className="inline-flex items-center gap-1">
						<CalendarDays {...DECORATIVE} className="size-3.5" />
						{edition.name}{" "}
						{edition.startDate &&
							`· ${new Date(edition.startDate).toLocaleDateString()}`}
						{edition.endDate &&
							` – ${new Date(edition.endDate).toLocaleDateString()}`}
					</span>
				</p>
			)}
			{stage && (
				<p className="text-xs text-(--sea-ink-soft)">
					<span className="inline-flex items-center gap-1">
						<Layers {...DECORATIVE} className="size-3.5" />
						Etapa {stage.sequenceOrder ?? "—"}: {stage.name}{" "}
						{stage.stageType && `· ${stage.stageType}`}
					</span>
				</p>
			)}
		</div>
	);
}

export function VenuePill({
	name,
	address,
	className,
	...props
}: {
	name: string;
	address?: string | null;
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-(--chip-bg) px-3 py-1 text-xs font-bold text-(--sea-ink-soft)",
				className,
			)}
			{...props}
		>
			<MapPin {...DECORATIVE} className="size-3.5 shrink-0" />
			<span>{name}</span>
			{address && (
				<span className="hidden sm:inline opacity-60">· {address}</span>
			)}
		</div>
	);
}

export function SportIcon({
	sportId,
	className,
	...props
}: { sportId: string } & React.HTMLAttributes<HTMLDivElement>) {
	const emoji: Record<string, string> = {
		football: "⚽",
		futsal: "⚽",
		"football-7": "⚽",
		basketball: "🏀",
		"basketball-3x3": "🏀",
		volleyball: "🏐",
		"beach-volleyball": "🏐",
		baseball: "⚾",
		softball: "🥎",
		tennis: "🎾",
		"tennis-best-of-5": "🎾",
	};
	return (
		<div
			className={cn(
				"flex h-8 w-8 items-center justify-center rounded-full border border-(--line) bg-(--chip-bg) text-sm",
				className,
			)}
			{...props}
		>
			{emoji[sportId] ?? "🏅"}
		</div>
	);
}

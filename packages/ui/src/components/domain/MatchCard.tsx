import type * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";

export type MatchStatus =
	| "scheduled"
	| "in_progress"
	| "paused"
	| "finished"
	| "cancelled"
	| "walkover";

export interface MatchCardProps extends React.HTMLAttributes<HTMLDivElement> {
	homeTeam: { id: string; name: string; logo?: string | null };
	awayTeam: { id: string; name: string; logo?: string | null };
	homeScore?: number | null;
	awayScore?: number | null;
	status: MatchStatus;
	scheduledAt?: string | Date | null;
	venueName?: string | null;
	roundLabel?: string | null;
	live?: boolean;
	onClick?: () => void;
}

const statusLabel: Record<MatchStatus, string> = {
	scheduled: "Programado",
	in_progress: "En juego",
	paused: "Pausa",
	finished: "Finalizado",
	cancelled: "Cancelado",
	walkover: "Walkover",
};

const statusVariant: Record<
	MatchStatus,
	"default" | "success" | "destructive" | "secondary"
> = {
	scheduled: "secondary",
	in_progress: "success",
	paused: "default",
	finished: "outline" as any,
	cancelled: "destructive",
	walkover: "destructive",
};

export function MatchCard({
	homeTeam,
	awayTeam,
	homeScore,
	awayScore,
	status,
	scheduledAt,
	venueName,
	roundLabel,
	live,
	onClick,
	className,
	...props
}: MatchCardProps) {
	const isLive = live ?? status === "in_progress";
	const showScore =
		homeScore !== null &&
		homeScore !== undefined &&
		awayScore !== null &&
		awayScore !== undefined;

	return (
		<Card
			onClick={onClick}
			className={cn(
				"relative overflow-hidden p-4 transition hover:translate-y-[-2px]",
				onClick && "cursor-pointer",
				isLive &&
					"ring-1 ring-[color-mix(in_oklab,var(--lagoon)_30%,transparent)]",
				className,
			)}
			{...props}
		>
			{roundLabel && (
				<div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--kicker)]">
					{roundLabel}
				</div>
			)}
			<div className="flex items-center justify-between gap-3">
				<TeamMini team={homeTeam} align="left" />
				<div className="flex flex-col items-center gap-1.5">
					{showScore ? (
						<div className="flex items-baseline gap-1 font-black text-[var(--sea-ink)]">
							<span className="text-2xl">{homeScore}</span>
							<span className="text-sm font-bold text-[var(--sea-ink-soft)]">
								:
							</span>
							<span className="text-2xl">{awayScore}</span>
						</div>
					) : (
						<div className="text-xs font-bold text-[var(--sea-ink-soft)]">
							{scheduledAt
								? new Date(scheduledAt).toLocaleString(undefined, {
										dateStyle: "short",
										timeStyle: "short",
									})
								: "—"}
						</div>
					)}
					<Badge variant={statusVariant[status]} className="gap-1">
						{isLive && (
							<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--lagoon)]" />
						)}
						{statusLabel[status]}
					</Badge>
				</div>
				<TeamMini team={awayTeam} align="right" />
			</div>
			{venueName && (
				<div className="mt-3 text-center text-xs text-[var(--sea-ink-soft)]">
					{venueName}
				</div>
			)}
		</Card>
	);
}

function TeamMini({
	team,
	align,
}: {
	team: { name: string; logo?: string | null };
	align: "left" | "right";
}) {
	return (
		<div
			className={cn(
				"flex min-w-0 flex-1 items-center gap-2",
				align === "right" && "flex-row-reverse text-right",
			)}
		>
			<div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--chip-bg)] text-xs font-black">
				{team.logo ? (
					<img
						src={team.logo}
						alt={team.name}
						className="h-full w-full object-cover"
					/>
				) : (
					team.name.slice(0, 2).toUpperCase()
				)}
			</div>
			<span className="truncate text-sm font-bold text-[var(--sea-ink)]">
				{team.name}
			</span>
		</div>
	);
}

export function LiveScore({
	homeScore,
	awayScore,
	status,
	className,
	...props
}: {
	homeScore: number;
	awayScore: number;
	status: MatchStatus;
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"inline-flex items-baseline gap-1.5 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1",
				className,
			)}
			{...props}
		>
			<span className="text-lg font-black">{homeScore}</span>
			<span className="text-xs text-[var(--sea-ink-soft)]">:</span>
			<span className="text-lg font-black">{awayScore}</span>
			{status === "in_progress" && (
				<span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--lagoon)]" />
			)}
		</div>
	);
}

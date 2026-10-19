import type * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { DECORATIVE, ShieldCheck, Users } from "../ui/icon";

export interface PlayerRowProps extends React.HTMLAttributes<HTMLDivElement> {
	player: {
		id: string;
		firstName: string;
		lastName: string;
		idCardNumber?: string | null;
		birthDate?: string | null;
	};
	jerseyNumber?: number | null;
	position?: string | null;
	isCaptain?: boolean;
}

export function PlayerRow({
	player,
	jerseyNumber,
	position,
	isCaptain,
	className,
	...props
}: PlayerRowProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-3 rounded-xl border border-(--line) bg-(--surface) p-3",
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-(--chip-bg) text-xs font-black border border-(--line)">
					{jerseyNumber ?? "—"}
				</div>
				<div className="min-w-0">
					<div className="truncate text-sm font-bold text-(--sea-ink)">
						{player.firstName} {player.lastName}{" "}
						{isCaptain && (
							<Badge variant="success" className="ml-1">
								C
							</Badge>
						)}
					</div>
					<div className="truncate text-xs text-(--sea-ink-soft)">
						{player.idCardNumber ?? "—"} {position && `· ${position}`}
					</div>
				</div>
			</div>
			{isCaptain && (
				<span className="inline-flex items-center gap-1 text-xs font-bold text-(--palm)">
					<ShieldCheck {...DECORATIVE} className="size-3.5" />
					Capitán
				</span>
			)}
		</div>
	);
}

export interface RosterTableProps extends React.HTMLAttributes<HTMLDivElement> {
	entries: Array<{
		id: string;
		player: PlayerRowProps["player"];
		jerseyNumber?: number | null;
		position?: string | null;
		isCaptain?: boolean;
	}>;
}

export function RosterTable({
	entries,
	className,
	...props
}: RosterTableProps) {
	if (!entries.length)
		return (
			<div
				className={cn(
					"flex items-center justify-center gap-2 p-4 text-center text-sm text-(--sea-ink-soft)",
					className,
				)}
			>
				<Users {...DECORATIVE} className="size-4" />
				Plantel vacío.
			</div>
		);
	return (
		<div className={cn("flex flex-col gap-2", className)} {...props}>
			{entries.map((e) => (
				<PlayerRow
					key={e.id}
					player={e.player}
					jerseyNumber={e.jerseyNumber}
					position={e.position}
					isCaptain={e.isCaptain}
				/>
			))}
		</div>
	);
}

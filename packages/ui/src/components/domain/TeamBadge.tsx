import type * as React from "react";
import { cn } from "../../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";

export interface TeamBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	team: {
		id: string;
		name: string;
		logo?: string | null;
		clubName?: string | null;
		category?: string | null;
	};
	size?: "sm" | "md" | "lg";
	showCategory?: boolean;
}

export function TeamBadge({
	team,
	size = "md",
	showCategory,
	className,
	...props
}: TeamBadgeProps) {
	const sizeCls =
		size === "sm"
			? "h-6 w-6 text-[10px]"
			: size === "lg"
				? "h-12 w-12 text-sm"
				: "h-8 w-8 text-xs";
	return (
		<div className={cn("flex items-center gap-2", className)} {...props}>
			<Avatar className={cn(sizeCls)}>
				{team.logo ? <AvatarImage src={team.logo} alt={team.name} /> : null}
				<AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
			</Avatar>
			<div className="min-w-0">
				<div className="truncate text-sm font-bold leading-none text-[var(--sea-ink)]">
					{team.name}
				</div>
				{(team.clubName || showCategory) && (
					<div className="flex items-center gap-1 text-xs text-[var(--sea-ink-soft)]">
						{team.clubName && <span className="truncate">{team.clubName}</span>}
						{team.category && showCategory && (
							<Badge variant="outline" className="h-4 px-1 py-0 text-[10px]">
								{team.category}
							</Badge>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export function ClubLogo({
	name,
	logo,
	className,
	...props
}: {
	name: string;
	logo?: string | null;
} & React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--chip-bg)]",
				className,
			)}
			{...props}
		>
			{logo ? (
				<img
					src={logo}
					alt={name}
					className="h-full w-full rounded-xl object-cover"
				/>
			) : (
				<span className="text-xs font-black">
					{name.slice(0, 2).toUpperCase()}
				</span>
			)}
		</div>
	);
}

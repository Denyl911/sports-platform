import type * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "secondary" | "outline" | "destructive" | "success";
}

const variantMap: Record<NonNullable<BadgeProps["variant"]>, string> = {
	default:
		"border-[var(--chip-line)] bg-[var(--chip-bg)] text-(--sea-ink-soft)",
	secondary:
		"border-[var(--line)] bg-[var(--surface-strong)] text-(--sea-ink-soft)",
	destructive:
		"border-[rgba(196,71,71,0.3)] bg-[rgba(196,71,71,0.1)] text-[#9f3030]",
	success:
		"border-[rgba(47,106,74,0.2)] bg-[rgba(47,106,74,0.12)] text-[var(--palm)]",
	outline: "border-[var(--line)] bg-transparent text-[var(--sea-ink)]",
};

export function Badge({
	className,
	variant = "default",
	...props
}: BadgeProps) {
	return (
		<div
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold leading-none",
				variantMap[variant],
				className,
			)}
			{...props}
		/>
	);
}

// Pill alias (legacy .demo-pill)
export const Pill = Badge;

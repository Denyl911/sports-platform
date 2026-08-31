import * as React from "react";
import { cn } from "../../lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "default" | "secondary" | "ghost" | "destructive" | "outline" | "link";
	size?: "default" | "sm" | "lg" | "icon";
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
	default:
		"border-[color-mix(in_oklab,var(--lagoon-deep)_34%,var(--line))] bg-[color-mix(in_oklab,var(--lagoon)_22%,var(--surface-strong))] text-[var(--sea-ink)] hover:bg-[color-mix(in_oklab,var(--lagoon)_30%,var(--surface-strong))] hover:-translate-y-0.5",
	secondary:
		"border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_74%,transparent)] text-[var(--sea-ink-soft)] hover:bg-[var(--surface-strong)]",
	destructive:
		"border-[rgba(196,71,71,0.28)] bg-[rgba(196,71,71,0.1)] text-[#9f3030] hover:bg-[rgba(196,71,71,0.18)]",
	outline: "border-[var(--line)] bg-transparent text-[var(--sea-ink)] hover:bg-[var(--surface)]",
	ghost: "border-transparent bg-transparent text-[var(--sea-ink-soft)] hover:bg-[var(--chip-bg)] hover:text-[var(--sea-ink)]",
	link: "border-transparent bg-transparent text-[var(--lagoon-deep)] underline-offset-4 hover:underline",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
	default: "h-10 px-4 py-2 text-sm",
	sm: "h-8 rounded-md px-3 text-xs",
	lg: "h-11 rounded-xl px-8 text-base",
	icon: "h-10 w-10 p-0",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = "default", size = "default", ...props }, ref) => {
		return (
			<button
				ref={ref}
				className={cn(
					"inline-flex items-center justify-center gap-2 rounded-[0.85rem] border text-sm font-bold leading-none transition-[background-color,border-color,color,transform,box-shadow] duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-55",
					variantClasses[variant],
					sizeClasses[size],
					"active:translate-y-0",
					className,
				)}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

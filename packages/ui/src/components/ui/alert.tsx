import * as React from "react";
import { cn } from "../../lib/utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "destructive";
}

const variantClasses: Record<NonNullable<AlertProps["variant"]>, string> = {
	default:
		"border-[rgba(193,126,42,0.3)] bg-[rgba(193,126,42,0.1)] text-[var(--sea-ink)]",
	destructive:
		"border-[rgba(196,71,71,0.3)] bg-[rgba(196,71,71,0.1)] text-[#9f3030]",
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
	({ className, variant = "default", ...props }, ref) => (
		<div
			ref={ref}
			role="alert"
			className={cn(
				"relative w-full rounded-xl border p-4",
				variantClasses[variant],
				className,
			)}
			{...props}
		/>
	),
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
	HTMLHeadingElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h5
		ref={ref}
		className={cn("mb-1 font-bold leading-none tracking-tight", className)}
		{...props}
	/>
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<p
		ref={ref}
		className={cn("text-sm leading-relaxed", className)}
		{...props}
	/>
));
AlertDescription.displayName = "AlertDescription";

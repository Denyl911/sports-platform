import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
	return (
		<input
			type={type}
			ref={ref}
			className={cn(
				"flex h-10 w-full rounded-[0.75rem] border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_88%,white_12%)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/60 outline-none transition-[border-color,box-shadow,background-color] focus:border-[color-mix(in_oklab,var(--lagoon-deep)_58%,var(--line))] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--lagoon)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
});
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				ref={ref}
				className={cn(
					"flex min-h-[7rem] w-full rounded-[0.75rem] border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_88%,white_12%)] px-3 py-2 text-sm text-[var(--sea-ink)] placeholder:text-[var(--sea-ink-soft)]/60 outline-none transition-[border-color,box-shadow] focus:border-[color-mix(in_oklab,var(--lagoon-deep)_58%,var(--line))] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--lagoon)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
					className,
				)}
				{...props}
			/>
		);
	},
);
Textarea.displayName = "Textarea";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
	({ className, ...props }, ref) => (
		<label ref={ref} className={cn("text-sm font-semibold leading-none text-[var(--sea-ink)] peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />
	),
);
Label.displayName = "Label";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
	({ className, children, ...props }, ref) => (
		<select
			ref={ref}
			className={cn(
				"flex h-10 w-full rounded-[0.75rem] border border-[var(--line)] bg-[color-mix(in_oklab,var(--surface-strong)_88%,white_12%)] px-3 py-2 text-sm text-[var(--sea-ink)] outline-none transition-[border-color,box-shadow] focus:border-[color-mix(in_oklab,var(--lagoon-deep)_58%,var(--line))] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--lagoon)_24%,transparent)] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{children}
		</select>
	),
);
Select.displayName = "Select";

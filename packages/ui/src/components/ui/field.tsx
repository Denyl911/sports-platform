import type * as React from "react";
import { cn } from "../../lib/utils";
import { Label } from "./input";

/**
 * Campo de formulario: etiqueta sobre el control y error/hint DEBAJO (fase 4).
 * Describiendo por aria lo decide el caller: el id del control es suyo (lo
 * necesita también para autofocus o para otro campo del mismo formulario).
 */
export interface FieldProps {
	label: string;
	/** id del control (el caller lo pone también en el input). */
	htmlFor: string;
	error?: string | null;
	hint?: string;
	className?: string;
	children: React.ReactNode;
}

export function Field({
	label,
	htmlFor,
	error,
	hint,
	className,
	children,
}: FieldProps) {
	return (
		<div className={cn("flex flex-col gap-1.5", className)}>
			<Label htmlFor={htmlFor}>{label}</Label>
			{children}
			{error ? (
				<p
					id={`${htmlFor}-error`}
					className="text-xs font-semibold text-[#a83c3c] dark:text-[#e08c8c]"
					role="alert"
				>
					{error}
				</p>
			) : hint ? (
				<p id={`${htmlFor}-hint`} className="text-xs text-(--sea-ink-soft)">
					{hint}
				</p>
			) : null}
		</div>
	);
}

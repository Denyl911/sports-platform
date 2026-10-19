import type * as React from "react";
import { cn } from "../../lib/utils";
import { DECORATIVE, type LucideIcon } from "./icon";

export interface EmptyStateProps {
	title: string;
	description?: string;
	/** El icono del dominio que falta (ver el vocabulario en `icon.ts`). */
	icon?: LucideIcon;
	action?: React.ReactNode;
	className?: string;
}

/**
 * Estado vacío reutilizable: reemplaza los bloques planos de texto
 * ("No hay X") por una tarjeta centrada con título, descripción opcional
 * y una acción opcional. Usa los mismos tokens que el resto del paquete.
 */
export function EmptyState({
	title,
	description,
	icon: Icon,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"demo-card flex flex-col items-center justify-center gap-1 px-6 py-10 text-center",
				className,
			)}
		>
			{Icon && (
				<span className="mb-2 flex size-12 items-center justify-center rounded-full bg-(--chip-bg) text-(--sea-ink-soft)">
					<Icon {...DECORATIVE} className="size-5" />
				</span>
			)}
			<p className="text-sm font-semibold text-(--sea-ink)">{title}</p>
			{description && (
				<p className="max-w-sm text-sm text-(--sea-ink-soft)">{description}</p>
			)}
			{action && <div className="mt-3">{action}</div>}
		</div>
	);
}

import type * as React from "react";
import { cn } from "../../lib/utils";

export interface EmptyStateProps {
	title: string;
	description?: string;
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
			<p className="text-sm font-semibold text-(--sea-ink)">{title}</p>
			{description && (
				<p className="max-w-sm text-sm text-(--sea-ink-soft)">{description}</p>
			)}
			{action && <div className="mt-3">{action}</div>}
		</div>
	);
}

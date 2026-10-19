import * as React from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { X } from "./icon";

/**
 * Panel lateral deslizante (drawer). Sin dependencias externas:
 * mismo contrato de cierre que EditDialog (Escape, fondo, candado de scroll).
 * El movimiento ancla el contenido en móvil: Header y navegación admin lo usan.
 */
export interface SheetProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	side?: "left" | "right";
}

export function Sheet({
	open,
	onClose,
	title,
	children,
	side = "right",
}: SheetProps) {
	React.useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label={title ?? "Menú"}
			className="fixed inset-0 z-50"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
			<div
				className={cn(
					"absolute inset-y-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-(--line) bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] p-5 shadow-[0_24px_48px_rgba(23,58,64,0.25)]",
					side === "right" ? "right-0 border-l" : "left-0 border-r",
				)}
			>
				<div className="mb-4 flex items-center justify-between gap-3">
					{title ? (
						<h2 className="text-lg font-bold text-(--sea-ink)">{title}</h2>
					) : (
						<span />
					)}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						icon={X}
						onClick={onClose}
						aria-label="Cerrar menú"
					/>
				</div>
				{children}
			</div>
		</div>
	);
}

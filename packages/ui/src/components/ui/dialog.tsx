import * as React from "react";
import { cn } from "../../lib/utils";
import { Alert } from "./alert";
import { Button } from "./button";
import { X } from "./icon";

export interface EditDialogProps {
	open: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	error?: string | null;
	wide?: boolean;
}

export function EditDialog({
	open,
	onClose,
	title,
	description,
	children,
	footer,
	error,
	wide = false,
}: EditDialogProps) {
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
			aria-label={title}
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
			<div
				className={cn(
					"relative w-full rounded-2xl border border-(--line) bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_24px_48px_rgba(23,58,64,0.25)]",
					wide ? "max-w-2xl" : "max-w-lg",
				)}
			>
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-lg font-bold text-(--sea-ink)">{title}</h2>
						{description && (
							<p className="mt-1 text-sm text-(--sea-ink-soft)">
								{description}
							</p>
						)}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						icon={X}
						onClick={onClose}
						aria-label="Cerrar diálogo"
					/>
				</div>
				<div className="mt-4">{children}</div>
				{error && (
					<Alert variant="destructive" className="mt-3 text-sm">
						{error}
					</Alert>
				)}
				{footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
			</div>
		</div>
	);
}

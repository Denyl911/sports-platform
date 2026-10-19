import * as React from "react";
import { cn } from "../../lib/utils";
import {
	CircleAlert,
	CircleCheck,
	DECORATIVE,
	Info,
	type LucideIcon,
	X,
} from "./icon";

// ---------------------------------------------------------------------------
// Toast mínimo, sin dependencias: emisor imperativo + <Toaster /> que pinta la
// pila. Las mutaciones llaman toast.success/toast.error si necesidad de estado
// local (reemplaza el pattern setError inline de las páginas admin).
// ---------------------------------------------------------------------------

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
	id: string;
	variant: ToastVariant;
	title: string;
	description?: string;
}

type Listener = (toast: ToastItem) => void;

const listeners = new Set<Listener>();
const DURATION_MS = 4000;
const MAX_STACK = 4;

function emit(variant: ToastVariant, title: string, description?: string) {
	const id = `${Date.now()}-${Math.random()}`;
	listeners.forEach((listener) =>
		listener({ id, variant, title, description }),
	);
}

export const toast = {
	success: (title: string, description?: string) =>
		emit("success", title, description),
	error: (title: string, description?: string) =>
		emit("error", title, description),
	info: (title: string, description?: string) =>
		emit("info", title, description),
} as const;

const variantClasses: Record<ToastVariant, string> = {
	success:
		"border-[rgba(47,106,74,0.35)] bg-[color-mix(in_oklab,var(--lagoon)_18%,var(--surface-strong))]",
	error: "border-[rgba(196,71,71,0.35)] bg-[rgba(196,71,71,0.12)]",
	info: "border-[var(--line)] bg-[var(--surface-strong)]",
};

const variantIcon: Record<ToastVariant, LucideIcon> = {
	success: CircleCheck,
	error: CircleAlert,
	info: Info,
};

const variantIconColor: Record<ToastVariant, string> = {
	success: "text-[var(--palm)]",
	error: "text-[#9f3030]",
	info: "text-(--sea-ink-soft)",
};

export interface ToasterProps {
	className?: string;
}

/**
 * Pila de toasts viva: monta el listener global. No emite nada en SSR
 * (los toasts nacen de interacciones), así que el HTML del servidor
 * queda limpio.
 */
export function Toaster({ className }: ToasterProps) {
	const [items, setItems] = React.useState<ToastItem[]>([]);

	React.useEffect(() => {
		function push(item: ToastItem) {
			setItems((prev) => [...prev, item].slice(-MAX_STACK));
			window.setTimeout(() => {
				setItems((prev) => prev.filter((t) => t.id !== item.id));
			}, DURATION_MS);
		}
		listeners.add(push);
		return () => {
			listeners.delete(push);
		};
	}, []);

	if (items.length === 0) return null;

	return (
		<div
			aria-live="polite"
			className={cn(
				"pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2",
				className,
			)}
		>
			{items.map((item) => {
				const Icon = variantIcon[item.variant];
				return (
					<div
						key={item.id}
						role="status"
						className={cn(
							"demo-card pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-[0_12px_24px_rgba(23,58,64,0.18)]",
							variantClasses[item.variant],
						)}
					>
						<Icon
							{...DECORATIVE}
							className={cn(
								"mt-0.5 size-4 shrink-0",
								variantIconColor[item.variant],
							)}
						/>
						<div className="min-w-0 flex-1">
							<p className="font-semibold text-(--sea-ink)">{item.title}</p>
							{item.description && (
								<p className="text-xs text-(--sea-ink-soft)">
									{item.description}
								</p>
							)}
						</div>
						<button
							type="button"
							aria-label="Descartar aviso"
							className="text-(--sea-ink-soft) hover:text-(--sea-ink)"
							onClick={() =>
								setItems((prev) => prev.filter((t) => t.id !== item.id))
							}
						>
							<X {...DECORATIVE} className="size-4" />
						</button>
					</div>
				);
			})}
		</div>
	);
}

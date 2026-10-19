import * as React from "react";
import { Button } from "./button";

// ---------------------------------------------------------------------------
// Confirmación con diálogo, no window.confirm: provider + hook que devuelve
// una promesa (mismos ergonomics del confirm() nativo que reemplaza) y un
// diálogo montado por el propio provider.
// ---------------------------------------------------------------------------

export interface ConfirmOptions {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** true por defecto: borrar es la acción que ocupa esta primitiva */
	destructive?: boolean;
}

interface PendingConfirm {
	options: ConfirmOptions;
	resolve: (answer: boolean) => void;
}

const ConfirmContext = React.createContext<
	((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export interface ConfirmProviderProps {
	children: React.ReactNode;
}

export function ConfirmProvider({ children }: ConfirmProviderProps) {
	const [pending, setPending] = React.useState<PendingConfirm | null>(null);

	const confirm = React.useCallback(
		(options: ConfirmOptions) =>
			new Promise<boolean>((resolve) => {
				setPending({ options, resolve });
			}),
		[],
	);

	function answer(value: boolean) {
		pending?.resolve(value);
		setPending(null);
	}

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{pending && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label={pending.options.title}
					className="fixed inset-0 z-[70] flex items-center justify-center p-4"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) answer(false);
					}}
				>
					<div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
					<div className="relative w-full max-w-md rounded-2xl border border-(--line) bg-[linear-gradient(165deg,var(--surface-strong),var(--surface))] p-6 shadow-[0_24px_48px_rgba(23,58,64,0.25)]">
						<h2 className="text-lg font-bold text-(--sea-ink)">
							{pending.options.title}
						</h2>
						{pending.options.description && (
							<p className="mt-1 text-sm text-(--sea-ink-soft)">
								{pending.options.description}
							</p>
						)}
						<div className="mt-5 flex justify-end gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => answer(false)}
							>
								{pending.options.cancelLabel ?? "Cancelar"}
							</Button>
							<Button
								type="button"
								variant={
									pending.options.destructive === false
										? "default"
										: "destructive"
								}
								size="sm"
								onClick={() => answer(true)}
							>
								{pending.options.confirmLabel ?? "Confirmar"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</ConfirmContext.Provider>
	);
}

/**
 * Devuelve la función de confirmación; lanza si el provider no está montado,
 * es un contrato de la app no optional silencioso.
 */
export function useConfirm() {
	const confirm = React.useContext(ConfirmContext);
	if (!confirm) {
		throw new Error(
			"useConfirm requiere <ConfirmProvider>; móntalo en el shell de la app.",
		);
	}
	return confirm;
}

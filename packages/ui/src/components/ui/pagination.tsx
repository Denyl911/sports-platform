import { cn } from "../../lib/utils";

/**
 * Pager compacto para listas administrativas: la API entrega el `total` del
 * universo y el cliente decide la ventana. Anterior/siguiente + "página X de
 * Y" + el universo a la vista; deshabilita y lo insinúa en aria.
 */
export interface PaginationProps {
	page: number;
	pageCount: number;
	total: number;
	/** Sustantivo contado, en singular y plural ("torneo"/"torneos"). */
	itemOne?: string;
	itemMany?: string;
	onChange: (page: number) => void;
	className?: string;
}

export function Pagination({
	page,
	pageCount,
	total,
	itemOne = "elemento",
	itemMany = "elementos",
	onChange,
	className,
}: PaginationProps) {
	const prev = () => onChange(Math.max(1, page - 1));
	const next = () => onChange(Math.min(pageCount, page + 1));
	return (
		<nav
			aria-label="Paginación"
			className={cn(
				"flex items-center gap-3 text-sm text-(--sea-ink-soft)",
				className,
			)}
		>
			<span aria-live="polite">
				{total} {total === 1 ? itemOne : itemMany}
			</span>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={prev}
					disabled={page <= 1}
					className="rounded-full border border-(--line) bg-(--chip-bg) px-3 py-1.5 text-xs font-bold text-(--sea-ink) hover:bg-(--surface-strong) disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Página anterior"
				>
					←
				</button>
				<span className="text-xs font-semibold text-(--sea-ink)">
					Página {pageCount > 0 ? page : 0} de {pageCount}
				</span>
				<button
					type="button"
					onClick={next}
					disabled={page >= pageCount}
					className="rounded-full border border-(--line) bg-(--chip-bg) px-3 py-1.5 text-xs font-bold text-(--sea-ink) hover:bg-(--surface-strong) disabled:cursor-not-allowed disabled:opacity-50"
					aria-label="Página siguiente"
				>
					→
				</button>
			</div>
		</nav>
	);
}

import { Input, Pagination, Select } from "@sports/ui";
import * as React from "react";
import { ADMIN_PAGE_SIZE, type AdminListSearch } from "../lib/admin-list";

/**
 * Toolbar + pager de las listas admin (fase 4): caja de búsqueda (cuando el
 * contrato del dominio tiene `search`), orden A-Z/Z-A y paginación real con
 * el total del envelope. Una fila: filtros a la izquierda, el recuento y las
 * flechas a la derecha. El router queda del lado de la página: entra por
 * callbacks que escriben sus search params.
 */
export function AdminListPager({
	search,
	total,
	hasSearch,
	hasOrder,
	itemOne = "elemento",
	itemMany = "elementos",
	extra,
	onPage,
	onOrder,
	onQuery,
}: {
	search: AdminListSearch;
	total: number;
	/** El contrato del listado trae `search` (players/venues/sports). */
	hasSearch?: boolean;
	/** El contrato del listado no trae `order` (p. ej. users): oculta A-Z. */
	hasOrder?: boolean;
	/** Sustantivo contado, en singular y plural ("club"/"clubes"). */
	itemOne?: string;
	itemMany?: string;
	/** Control propio de la página (p. ej. el orden de torneos). */
	extra?: React.ReactNode;
	onPage: (page: number | undefined) => void;
	onOrder: (order: "desc" | undefined) => void;
	onQuery: (q: string | undefined) => void;
}) {
	const [q, setQ] = React.useState(search.q ?? "");
	const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
	return (
		<div className="flex flex-wrap items-center gap-3">
			{hasSearch && (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						onQuery(q || undefined);
					}}
				>
					<Input
						name="q"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Buscar"
						aria-label="Buscar por nombre"
						className="w-56"
					/>
				</form>
			)}
			{hasOrder !== false && (
				<span className="flex items-center gap-2 text-xs font-bold text-(--sea-ink-soft)">
					Orden
					<Select
						aria-label="Orden"
						value={search.order ?? ""}
						onChange={(e) =>
							onOrder(e.target.value === "desc" ? "desc" : undefined)
						}
						className="w-32"
					>
						<option value="">A → Z</option>
						<option value="desc">Z → A</option>
					</Select>
				</span>
			)}
			{extra}
			<div className="ml-auto">
				<Pagination
					page={search.page ?? 1}
					pageCount={pageCount}
					total={total}
					itemOne={itemOne}
					itemMany={itemMany}
					onChange={(page) => onPage(page > 1 ? page : undefined)}
				/>
			</div>
		</div>
	);
}

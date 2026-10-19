import { Input, Pagination, Select } from "@sports/ui";
import * as React from "react";
import { ADMIN_PAGE_SIZE, type AdminListSearch } from "../lib/admin-list";

/**
 * Toolbar + pager de las listas admin (fase 4): caja de búsqueda (cuando el
 * contrato del dominio tiene `search`), orden A-Z/Z-A y paginación real con
 * el total del envelope. El router queda de su lado: cada página pasa las
 * callbacks que escriben sus search params.
 */
export function AdminListPager({
	search,
	total,
	hasSearch,
	hasOrder,
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
	onPage: (page: number | undefined) => void;
	onOrder: (order: "desc" | undefined) => void;
	onQuery: (q: string | undefined) => void;
}) {
	const [q, setQ] = React.useState(search.q ?? "");
	const pageCount = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
	return (
		<div className="flex flex-wrap items-end gap-2">
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
				<Select
					value={search.order ?? ""}
					onChange={(e) =>
						onOrder(e.target.value === "desc" ? "desc" : undefined)
					}
					aria-label="Ordenar"
					className="w-40"
				>
					<option value="">A → Z</option>
					<option value="desc">Z → A</option>
				</Select>
			)}
			<Pagination
				page={search.page ?? 1}
				pageCount={pageCount}
				total={total}
				onChange={(page) => onPage(page > 1 ? page : undefined)}
			/>
		</div>
	);
}

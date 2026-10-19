/**
 * El mueble común de las listas admin: page/q/sort/order viven en search
 * params (compartibles por URL) y se traducen al contrato de ventana de la
 * API — sin limit la lista responde todo; con ella, la página y el total del
 * universo (que es lo que el pager necesita).
 */
export const ADMIN_PAGE_SIZE = 20;

export interface AdminListSearch {
	page?: number;
	q?: string;
	order?: "asc" | "desc";
	sort?: "name" | "createdAt";
	/** Filtro de dominio propio de una página (teams filtra por club). */
	clubId?: string;
}

/** Normalizador de search params para `validateSearch` de la ruta. */
export function adminListSearch(search: Record<string, unknown>) {
	const pageRaw = Number(search.page);
	return {
		page: Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : undefined,
		q: typeof search.q === "string" && search.q ? search.q : undefined,
		order: search.order === "desc" ? ("desc" as const) : undefined,
		sort: search.sort === "name" ? ("name" as const) : undefined,
		clubId:
			typeof search.clubId === "string" && search.clubId
				? search.clubId
				: undefined,
	};
}

/** Ventana + filtros como body del filtro del contrato del dominio. */
export function adminListFilters(
	search: AdminListSearch,
	limit = ADMIN_PAGE_SIZE,
) {
	return {
		...(search.sort ? { sort: search.sort } : {}),
		...(search.order ? { order: search.order } : {}),
		...(search.q ? { search: search.q } : {}),
		limit,
		offset: (search.page ?? 1) * limit - limit,
	};
}

export type EditionCategory = "open" | "u18" | "senior";

export const CATEGORIES: Record<
	EditionCategory,
	{ label: string; description: string }
> = {
	open: { label: "Libre", description: "Sin restricción de edad" },
	u18: { label: "Sub-18", description: "Menores de 18 años" },
	senior: { label: "Senior", description: "Adultos" },
};

export const CATEGORY_OPTIONS = (
	Object.entries(CATEGORIES) as [EditionCategory, (typeof CATEGORIES)[EditionCategory]][]
).map(([value, { label }]) => ({ value, label }));

export type EditionStatus =
	| "draft"
	| "registration"
	| "in_progress"
	| "finished"
	| "archived"
	| "cancelled";

export const EDITION_STATUS: Record<
	EditionStatus,
	{ label: string; description: string }
> = {
	draft: { label: "Borrador", description: "Edición en preparación, aún no visible" },
	registration: { label: "Inscripción", description: "ABIerta para inscripciones de equipos" },
	in_progress: { label: "En curso", description: "La edición está activa" },
	finished: { label: "Finalizada", description: "La edición terminó" },
	archived: { label: "Archivada", description: "Guardada históricamente, sin actividad" },
	cancelled: { label: "Cancelada", description: "Edición cancelada, estado terminal" },
};

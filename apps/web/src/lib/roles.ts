export type MemberRole = "organizer" | "referee" | "statistician" | "viewer_staff";

export const ROLE_INFO: Record<
	MemberRole,
	{ label: string; description: string }
> = {
	organizer: {
		label: "Organizador",
		description: "Control completo del torneo",
	},
	referee: {
		label: "Árbitro",
		description: "Marcador y eventos en vivo",
	},
	statistician: {
		label: "Estadístico",
		description: "Cálculo y corrección de posiciones",
	},
	viewer_staff: {
		label: "Observador",
		description: "Solo lectura",
	},
};

export const ROLE_OPTIONS = (
	Object.entries(ROLE_INFO) as [MemberRole, (typeof ROLE_INFO)[MemberRole]][]
).map(([value, { label }]) => ({ value, label }));

import {
	ArrowRight,
	CalendarDays,
	Card,
	DECORATIVE,
	Layers,
	type LucideIcon,
	Swords,
	Trophy,
} from "@sports/ui";
import { Link } from "@tanstack/react-router";

/**
 * Guía del primer torneo: la cadena de una competencia contada antes de
 * tener datos. Vive aquí y no en cada página porque la usan el dashboard
 * (cuando no hay ningún torneo) y la lista de torneos (cuando está vacía),
 * y las dos deben decir lo mismo.
 */
const FIRST_TOURNAMENT_STEPS: Array<{
	icon: LucideIcon;
	title: string;
	body: string;
}> = [
	{
		icon: Trophy,
		title: "Torneo",
		body: "La competición: nómbrala y elige el deporte.",
	},
	{
		icon: CalendarDays,
		title: "Edición",
		body: "La temporada concreta: fechas y categoría.",
	},
	{
		icon: Layers,
		title: "Etapas",
		body: "Liguilla, cuadro o fase de grupos con sus grupos.",
	},
	{
		icon: Swords,
		title: "Partidos",
		body: "Inscribe equipos, arma el fixture y juega.",
	},
];

export function FirstTournamentGuide({
	className,
	cta = true,
}: {
	className?: string;
	/** El CTA sobra donde el formulario ya está a la vista. */
	cta?: boolean;
}) {
	return (
		<Card className={className ? `p-5 ${className}` : "p-5"}>
			<h3 className="font-bold text-(--sea-ink)">
				Tu primer torneo, en cuatro pasos
			</h3>
			<ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{FIRST_TOURNAMENT_STEPS.map((step) => (
					<li
						key={step.title}
						className="rounded-xl border border-(--line) bg-(--surface) p-3"
					>
						<p className="flex items-center gap-2 text-sm font-bold text-(--sea-ink)">
							<step.icon
								{...DECORATIVE}
								className="size-4 text-(--sea-ink-soft)"
							/>
							{step.title}
						</p>
						<p className="mt-1 text-xs text-(--sea-ink-soft)">{step.body}</p>
					</li>
				))}
			</ol>
			{cta && (
				<Link
					to="/admin/tournaments"
					className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-(--sea-ink) no-underline"
				>
					Crear el primer torneo
					<ArrowRight {...DECORATIVE} className="size-4" />
				</Link>
			)}
		</Card>
	);
}

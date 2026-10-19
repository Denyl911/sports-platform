import { Card } from "@sports/ui";
import { Link } from "@tanstack/react-router";

/**
 * Guía del primer torneo: la cadena de una competencia contada antes de
 * tener datos. Vive aquí y no en cada página porque la usan el dashboard
 * (cuando no hay ningún torneo) y la lista de torneos (cuando está vacía),
 * y las dos deben decir lo mismo.
 */
const FIRST_TOURNAMENT_STEPS: Array<[string, string]> = [
	["1. Torneo", "La competición: nómbrala y elige el deporte."],
	["2. Edición", "La temporada concreta: fechas y categoría."],
	["3. Etapas", "Liguilla, cuadro o fase de grupos con sus grupos."],
	["4. Partidos", "Inscribe equipos, arma el fixture y juega."],
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
				{FIRST_TOURNAMENT_STEPS.map(([title, body]) => (
					<li
						key={title}
						className="rounded-xl border border-(--line) bg-(--surface) p-3"
					>
						<p className="text-sm font-bold text-(--sea-ink)">{title}</p>
						<p className="mt-1 text-xs text-(--sea-ink-soft)">{body}</p>
					</li>
				))}
			</ol>
			{cta && (
				<Link
					to="/admin/tournaments"
					className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-(--sea-ink) no-underline"
				>
					Crear el primer torneo
					<span aria-hidden="true">→</span>
				</Link>
			)}
		</Card>
	);
}

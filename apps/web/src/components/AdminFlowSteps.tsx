import { Badge, Check, ChevronRight, cn, DECORATIVE } from "@sports/ui";

/**
 * La cadena de una competencia, a la vista: torneo → edición → etapa →
 * grupos → partidos. Cada página de la cadena dice en qué paso está y cuál
 * viene después, que es lo que faltaba para crear el primer torneo sin
 * adivinar. Los nombres son el vocabulario de CONTEXT.md, no sinónimos.
 */
export type AdminFlowStep =
	| "tournament"
	| "edition"
	| "stage"
	| "group"
	| "match";

const STEPS: Array<{ id: AdminFlowStep; label: string; hint: string }> = [
	{ id: "tournament", label: "Torneo", hint: "La competición y su deporte." },
	{
		id: "edition",
		label: "Edición",
		hint: "La temporada concreta: fechas y categoría.",
	},
	{
		id: "stage",
		label: "Etapa",
		hint: "Liguilla, cuadro de eliminación o fase de grupos.",
	},
	{ id: "group", label: "Grupos", hint: "La tabla y los cruces del grupo." },
	{ id: "match", label: "Partidos", hint: "El fixture y los resultados." },
];

export function AdminFlowSteps({
	current,
	className,
}: {
	current: AdminFlowStep;
	className?: string;
}) {
	const currentIndex = STEPS.findIndex((step) => step.id === current);
	return (
		<ol
			aria-label="Pasos de la competencia"
			className={cn("flex flex-wrap items-center gap-1.5", className)}
		>
			{STEPS.map((step, i) => {
				const done = i < currentIndex;
				const active = i === currentIndex;
				return (
					<li key={step.id} className="flex items-center gap-1.5">
						<Badge
							title={step.hint}
							aria-current={active ? "step" : undefined}
							variant={done ? "success" : active ? "default" : "outline"}
						>
							<span aria-hidden="true">
								{done ? <Check {...DECORATIVE} className="size-3.5" /> : i + 1}
							</span>
							{step.label}
						</Badge>
						{i < STEPS.length - 1 && (
							<ChevronRight
								{...DECORATIVE}
								className="size-3.5 text-(--sea-ink-soft)/50"
							/>
						)}
					</li>
				);
			})}
		</ol>
	);
}

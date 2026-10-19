import { queryKeys, unwrap } from "@sports/api-client";
import {
	useStagesByEdition,
	useTournamentEditions,
} from "@sports/api-client/hooks";
import { ChevronRight, DECORATIVE } from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { api } from "../lib/api";

/**
 * Rastro de contexto del admin — la cadena Competencia con el nombre real de
 * lo que se está editando (fase 4). Los nombres salen del cache que las
 * páginas ya cargan; un deep-link dispara el detalle/lista una vez (los
 * detalles no están en un presupuesto — docs/todo.md P3).
 */

export interface ChainPiece {
	label: string;
	to?: string;
}

export function AdminBreadcrumbs({ pieces }: { pieces: ChainPiece[] }) {
	return (
		<nav aria-label="Ruta" className="text-xs">
			<ol className="flex flex-wrap items-center gap-1.5">
				{pieces.map((piece) => {
					// Igualdad por referencia: las piezas se construyen en cada render.
					const isLast = piece === pieces[pieces.length - 1];
					return (
						<li
							key={`${piece.label}:${piece.to ?? "current"}`}
							className="flex items-center gap-1.5"
						>
							{piece.to && !isLast ? (
								<Link
									to={piece.to}
									className="font-semibold text-(--sea-ink-soft) no-underline hover:text-(--sea-ink) hover:underline"
								>
									{piece.label}
								</Link>
							) : (
								<span
									aria-current="page"
									className="font-bold text-(--sea-ink)"
								>
									{piece.label}
								</span>
							)}
							{!isLast && (
								<ChevronRight
									{...DECORATIVE}
									className="size-3.5 text-(--sea-ink-soft)/50"
								/>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

/** Nombre del torneo por id: cache compartido con la página del torneo. */
export function useTournamentName(tournamentId?: string | null) {
	const { data } = useQuery({
		queryKey: queryKeys.tournaments.detail(tournamentId ?? ""),
		queryFn: () =>
			unwrap(api.tournaments({ tournamentId: tournamentId ?? "" }).get()),
		enabled: !!tournamentId,
		staleTime: 5 * 60_000,
	});
	const t = data as { name: string } | undefined;
	return t?.name ?? "Torneo";
}

/** Nombre de la edición dentro de un torneo. */
export function useEditionName(tournamentId: string | null, editionId: string) {
	const { data } = useTournamentEditions(api, tournamentId ?? "", {
		enabled: !!tournamentId,
	});
	const editions = (data as { items: Array<{ id: string; name: string }> })
		?.items;
	return editions?.find((e) => e.id === editionId)?.name ?? "Edición";
}

/** Nombre de la etapa dentro de una edición. */
export function useStageName(editionId: string | null, stageId: string) {
	const { data } = useStagesByEdition(api, editionId ?? "", {
		enabled: !!editionId,
	});
	const stages = (data as { items: Array<{ id: string; name: string }> })
		?.items;
	return stages?.find((s) => s.id === stageId)?.name ?? "Etapa";
}

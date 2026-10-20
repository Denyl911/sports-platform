import type { LiveStatus } from "@sports/api-client/live";
import {
	Badge,
	CircleAlert,
	CircleDot,
	DECORATIVE,
	type LucideIcon,
	Radio,
	RefreshCw,
	WifiOff,
} from "@sports/ui";
import * as React from "react";

/** Etiquetas del estado de la conexión WS, en español. */
export const LIVE_STATUS_LABELS: Record<LiveStatus, string> = {
	open: "En vivo",
	connecting: "Conectando…",
	reconnecting: "Reconectando…",
	closed: "Transmisión cerrada",
	idle: "Sin conexión",
	error: "Error de transmisión",
};

/** El estado de la conexión, en icono. `open` lo pinta el punto que late. */
const LIVE_STATUS_ICONS: Record<LiveStatus, LucideIcon> = {
	open: Radio,
	connecting: RefreshCw,
	reconnecting: RefreshCw,
	closed: WifiOff,
	idle: WifiOff,
	error: CircleAlert,
};

export type MatchStatusLike =
	| "scheduled"
	| "in_progress"
	| "paused"
	| "finished"
	| "cancelled"
	| "walkover";

/** Etiquetas de estado del partido — el vocabulario de MatchCard, en español. */
export const MATCH_STATUS_LABELS: Record<MatchStatusLike, string> = {
	scheduled: "Programado",
	in_progress: "En juego",
	paused: "Pausa",
	finished: "Finalizado",
	cancelled: "Cancelado",
	walkover: "Walkover",
};

/** La variante de `Badge` que corresponde a cada estado del partido. */
export function matchStatusBadgeVariant(
	status: MatchStatusLike,
): "default" | "secondary" | "outline" | "destructive" | "success" {
	switch (status) {
		case "finished":
		case "walkover":
			return "success";
		case "cancelled":
			return "destructive";
		case "in_progress":
		case "paused":
			return "default";
		default:
			return "secondary";
	}
}

/**
 * Insignia honesta de conexión: visible solo si el partido está en juego,
 * o si la conexión activa dice otra cosa (reconectando, error).
 * Si no hay nada que contar, no ensucia el hero.
 */
export function LiveBadge({
	status,
	matchStatus,
}: {
	status: LiveStatus;
	matchStatus: MatchStatusLike;
}) {
	const relevant =
		matchStatus === "in_progress" ||
		matchStatus === "paused" ||
		status === "reconnecting" ||
		status === "error";
	if (!relevant) return null;

	const variant =
		status === "open"
			? ("success" as const)
			: status === "error"
				? ("destructive" as const)
				: ("secondary" as const);
	const StatusIcon = LIVE_STATUS_ICONS[status];

	return (
		<Badge variant={variant} className="gap-1">
			{status === "open" ? (
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--lagoon-deep)" />
			) : (
				<StatusIcon {...DECORATIVE} className="size-3.5" />
			)}
			{LIVE_STATUS_LABELS[status]}
		</Badge>
	);
}

/**
 * Marcador central con pulso al anotar: el lado que cambia escala y se
 * tiñe por ~900 ms. Pura clase condicional al re-render: sin keyframes.
 */
export function AnimatedScore({
	homeScore,
	awayScore,
}: {
	homeScore: number;
	awayScore: number;
}) {
	const [pulse, setPulse] = React.useState<"home" | "away" | null>(null);
	const prev = React.useRef({ homeScore, awayScore });

	React.useEffect(() => {
		let changed: "home" | "away" | null = null;
		if (prev.current.homeScore !== homeScore) changed = "home";
		else if (prev.current.awayScore !== awayScore) changed = "away";
		prev.current = { homeScore, awayScore };
		if (!changed) return;
		setPulse(changed);
		const t = setTimeout(() => setPulse(null), 900);
		return () => clearTimeout(t);
	}, [homeScore, awayScore]);

	const side = (which: "home" | "away") =>
		pulse === which
			? "scale-125 text-(--lagoon-deep)"
			: "scale-100 text-(--sea-ink)";

	return (
		<div aria-live="polite" className="flex items-baseline gap-3 font-black">
			<span
				className={`text-5xl transition-all duration-500 ease-out sm:text-6xl ${side("home")}`}
			>
				{homeScore}
			</span>
			<span className="text-2xl font-bold text-(--sea-ink-soft)">:</span>
			<span
				className={`text-5xl transition-all duration-500 ease-out sm:text-6xl ${side("away")}`}
			>
				{awayScore}
			</span>
		</div>
	);
}

interface TimelineEvent {
	id: string;
	teamId?: string | null;
	eventType: string;
	periodNumber?: number | null;
	minuteOrSecond?: number | null;
}

/**
 * El suceso, en glifo. Los códigos son de dominio (los define cada deporte) y
 * los emoji son aquí la señal correcta: una tarjeta amarilla es amarilla y
 * ninguna fuente de iconos sabe de tarjetas. El resto de la vista usa
 * `lucide` (`@sports/ui`); esto es contenido, no cromo.
 */
const EVENT_ICONS: Record<string, string> = {
	goal: "⚽",
	yellow_card: "🟨",
	red_card: "🟥",
	substitution: "🔁",
	timeout: "⏱",
	foul: "🚫",
};

/**
 * Cronología de eventos de un partido: más reciente arriba, un punto por
 * suceso y minuto (o segundo) visible. Compartida entre el detalle público
 * y el pestañón de eventos del operador admin.
 */
export function MatchTimeline({
	events,
	teams,
	labels,
}: {
	events: TimelineEvent[];
	teams: Array<{ id: string; name: string }>;
	/** Código de evento → nombre del catálogo del deporte ("goal" → "Gol"). */
	labels?: Record<string, string>;
}) {
	if (events.length === 0) return null;
	const teamName = (id?: string | null) =>
		teams.find((t) => t.id === id)?.name ?? null;

	const ordered = [...events].reverse();

	return (
		<ul className="space-y-2">
			{ordered.map((ev) => {
				const name = teamName(ev.teamId);
				const glyph = EVENT_ICONS[ev.eventType];
				const label = labels?.[ev.eventType] ?? ev.eventType;
				return (
					<li
						key={ev.id}
						className="flex items-center gap-2.5 rounded-xl border border-(--line) bg-(--chip-bg) px-3 py-2 text-sm"
					>
						<span
							aria-hidden
							className="text-base leading-none"
							title={ev.eventType}
						>
							{glyph ?? <CircleDot {...DECORATIVE} className="size-4" />}
						</span>
						<span className="font-bold text-(--sea-ink)">{label}</span>
						{name && (
							<span className="truncate text-(--sea-ink-soft)">{name}</span>
						)}
						<span className="ml-auto shrink-0 text-xs font-bold text-(--sea-ink-soft)">
							{ev.minuteOrSecond != null
								? `${ev.minuteOrSecond}'`
								: ev.periodNumber != null
									? `P${ev.periodNumber}`
									: ""}
						</span>
					</li>
				);
			})}
		</ul>
	);
}

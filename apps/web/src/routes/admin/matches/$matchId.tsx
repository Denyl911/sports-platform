import {
	getApiErrorMessage,
	type MatchDetail,
	queryKeys,
	unwrap,
} from "@sports/api-client";
import {
	useAssignVenue,
	useDeleteMatch,
	useRecordLiveEvent,
	useScheduleMatch,
	useSportEventTypes,
	useUpdateMatch,
	useUpdateMatchScore,
	useVenues,
} from "@sports/api-client/hooks";
import { useMatchLive } from "@sports/api-client/live";
import {
	Badge,
	Button,
	Card,
	Input,
	Label,
	MatchCard,
	Plus,
	Save,
	Select,
	Skeleton,
	Trash2,
	toast,
	useConfirm,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { AdminBreadcrumbs } from "../../../components/AdminBreadcrumbs";
import {
	LiveBadge,
	MATCH_STATUS_LABELS,
	type MatchStatusLike,
	MatchTimeline,
} from "../../../components/live-ui";
import { api, getStoredAccessToken } from "../../../lib/api";

export const Route = createFileRoute("/admin/matches/$matchId")({
	component: AdminMatchLivePage,
});

function AdminMatchLivePage() {
	const { matchId } = Route.useParams();
	const navigate = useNavigate();
	const { data: matchData } = useQuery({
		queryKey: queryKeys.matches.detail(matchId),
		queryFn: () => unwrap(api.matches({ id: matchId }).get()),
	});
	const match = matchData as MatchDetail | undefined;
	const scheduledAtIso = match?.scheduledAt
		? new Date(match.scheduledAt).toISOString()
		: null;

	const updateScore = useUpdateMatchScore(api);
	const live = useMatchLive(matchId, {
		getToken: getStoredAccessToken,
		updateCache: true,
	});

	const [homeScore, setHomeScore] = React.useState(0);
	const [awayScore, setAwayScore] = React.useState(0);
	const [status, setStatus] = React.useState("in_progress");
	const [tab, setTab] = React.useState<
		"score" | "events" | "venue" | "schedule" | "info"
	>("score");

	React.useEffect(() => {
		if (match) {
			setHomeScore(match.homeScore);
			setAwayScore(match.awayScore);
			setStatus(match.status);
		}
	}, [match]);

	const onSendLive = () => {
		try {
			live.sendScore({ homeScore, awayScore, status });
		} catch (err) {
			toast.error(
				"No se pudo enviar el marcador en vivo",
				getApiErrorMessage(err),
			);
		}
	};

	const onPatchScore = async () => {
		try {
			await updateScore.mutateAsync({
				id: matchId,
				body: { homeScore, awayScore, status } as never,
			});
			toast.success("Marcador guardado");
		} catch (err) {
			toast.error("No se pudo guardar el marcador", getApiErrorMessage(err));
		}
	};

	if (!match)
		return (
			<div className="demo-center space-y-3 w-full">
				<Skeleton className="mx-auto h-24 w-full max-w-2xl rounded-xl" />
				<div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-3">
					<Skeleton className="h-16 rounded-xl" />
					<Skeleton className="h-16 rounded-xl" />
				</div>
			</div>
		);

	return (
		<div className="space-y-6">
			<AdminBreadcrumbs
				pieces={[
					{ label: "Admin", to: "/admin" },
					{ label: "Torneos", to: "/admin/tournaments" },
					{
						label: `${match.homeTeam?.name ?? "Local"} vs ${match.awayTeam?.name ?? "Visitante"}`,
					},
				]}
			/>

			<MatchCard
				homeTeam={{
					id: match.homeTeam?.id ?? match.homeTeamId ?? "home",
					name: match.homeTeam?.name ?? "Por definir",
				}}
				awayTeam={{
					id: match.awayTeam?.id ?? match.awayTeamId ?? "away",
					name: match.awayTeam?.name ?? "Por definir",
				}}
				homeScore={match.homeScore}
				awayScore={match.awayScore}
				status={match.status}
				scheduledAt={match.scheduledAt}
				live={live.isOpen}
				roundLabel={
					match.groupId ? `Grupo ${match.groupId.slice(0, 6)}` : undefined
				}
			/>

			<Card className="p-4">
				<div className="flex flex-wrap gap-1.5">
					{(
						[
							["score", "Score"],
							["events", "Eventos"],
							["venue", "Sede"],
							["schedule", "Programación"],
							["info", "Info"],
						] as const
					).map(([key, label]) => (
						<button
							type="button"
							key={key}
							onClick={() => setTab(key)}
							className={`rounded-full border px-3 py-1.5 text-xs font-bold ${tab === key ? "bg-(--lagoon) text-white border-(--lagoon-deep)" : "bg-(--chip-bg) text-(--sea-ink-soft) border-(--line)"}`}
						>
							{label}
						</button>
					))}
				</div>

				<div className="mt-4">
					{tab === "score" && (
						<ScoreTab
							matchId={matchId}
							homeName={match.homeTeam?.name ?? "Local"}
							awayName={match.awayTeam?.name ?? "Visita"}
							homeScore={homeScore}
							awayScore={awayScore}
							status={status}
							setHomeScore={setHomeScore}
							setAwayScore={setAwayScore}
							setStatus={setStatus}
							live={live}
							updateScore={updateScore}
							onSendLive={onSendLive}
							onPatchScore={onPatchScore}
						/>
					)}
					{tab === "events" && (
						<EventsTab
							matchId={matchId}
							sportId={match.sportId}
							live={live}
							events={match.events}
							participants={[
								...(match.homeTeam
									? [{ id: match.homeTeam.id, name: match.homeTeam.name }]
									: []),
								...(match.awayTeam
									? [{ id: match.awayTeam.id, name: match.awayTeam.name }]
									: []),
							]}
						/>
					)}
					{tab === "venue" && (
						<VenueTab matchId={matchId} venueId={match.venueId} />
					)}
					{tab === "schedule" && (
						<ScheduleTab matchId={matchId} scheduledAt={scheduledAtIso} />
					)}
					{tab === "info" && (
						<InfoTab
							matchId={matchId}
							status={match.status}
							onDeleted={() => navigate({ to: "/admin/tournaments" })}
						/>
					)}
				</div>
			</Card>
		</div>
	);
}

function ScoreTab({
	homeName,
	awayName,
	homeScore,
	awayScore,
	status,
	setHomeScore,
	setAwayScore,
	setStatus,
	live,
	updateScore,
	onSendLive,
	onPatchScore,
}: {
	matchId: string;
	homeName: string;
	awayName: string;
	homeScore: number;
	awayScore: number;
	status: string;
	setHomeScore: (n: number) => void;
	setAwayScore: (n: number) => void;
	setStatus: (s: string) => void;
	live: ReturnType<typeof useMatchLive>;
	updateScore: ReturnType<typeof useUpdateMatchScore>;
	onSendLive: () => void;
	onPatchScore: () => Promise<void>;
}) {
	const sendLive = (nextHome: number, nextAway: number, nextStatus: string) => {
		try {
			live.sendScore({
				homeScore: nextHome,
				awayScore: nextAway,
				status: nextStatus,
			});
		} catch (err) {
			toast.error("No se pudo transmitir en vivo", getApiErrorMessage(err));
		}
	};

	// Rápido del árbitro: un toque = anotar y transmitir en la misma acción.
	const quick = (side: "home" | "away", delta: -1 | 1) => {
		const next = Math.max(0, (side === "home" ? homeScore : awayScore) + delta);
		if (side === "home") setHomeScore(next);
		else setAwayScore(next);
		if (live.isOpen)
			sendLive(
				side === "home" ? next : homeScore,
				side === "away" ? next : awayScore,
				status,
			);
	};

	return (
		<div className="space-y-4">
			<LiveBadge status={live.status} matchStatus={status as MatchStatusLike} />

			<div className="flex flex-wrap items-stretch justify-center gap-4 sm:gap-8">
				<ScorePad
					title={homeName}
					score={homeScore}
					onQuick={(d) => quick("home", d)}
				/>
				<span className="self-center pb-6 text-xl font-bold text-(--sea-ink-soft)">
					:
				</span>
				<ScorePad
					title={awayName}
					score={awayScore}
					onQuick={(d) => quick("away", d)}
				/>
			</div>

			<div>
				<Label>Estado del partido</Label>
				<div className="mt-2 flex flex-wrap gap-1.5">
					{(Object.keys(MATCH_STATUS_LABELS) as MatchStatusLike[]).map(
						(key) => (
							<button
								type="button"
								key={key}
								onClick={() => setStatus(key)}
								className={`rounded-full border px-3 py-1.5 text-xs font-bold ${status === key ? "bg-(--lagoon) text-white border-(--lagoon-deep)" : "bg-(--chip-bg) text-(--sea-ink-soft) border-(--line)"}`}
							>
								{MATCH_STATUS_LABELS[key]}
							</button>
						),
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-2">
				<Button onClick={onSendLive} disabled={!live.isOpen}>
					{live.isOpen ? "Transmitir en vivo" : "Sin transmisión"}
				</Button>
				<Button
					variant="secondary"
					icon={Save}
					onClick={onPatchScore}
					disabled={updateScore.isPending}
				>
					{updateScore.isPending ? "Guardando…" : "Guardar definitivo"}
				</Button>
			</div>
			{live.lastError && (
				<div className="demo-alert-danger text-sm">
					WS error: {live.lastError.message}
				</div>
			)}
		</div>
	);
}

function ScorePad({
	title,
	score,
	onQuick,
}: {
	title: string;
	score: number;
	onQuick: (delta: -1 | 1) => void;
}) {
	return (
		<div className="flex flex-col items-center gap-2 rounded-xl border border-(--line) bg-(--surface) px-5 py-3">
			<span className="text-xs font-bold uppercase tracking-widest text-(--sea-ink-soft)">
				{title}
			</span>
			<span className="text-4xl font-black text-(--sea-ink)">{score}</span>
			<div className="flex gap-2">
				<button
					type="button"
					aria-label={`Restar gol de ${title}`}
					onClick={() => onQuick(-1)}
					className="h-9 w-9 rounded-full border border-(--line) bg-(--chip-bg) text-lg font-black text-(--sea-ink-soft) hover:bg-(--surface-strong)"
				>
					−
				</button>
				<button
					type="button"
					aria-label={`Anotar gol de ${title}`}
					onClick={() => onQuick(1)}
					className="h-9 w-9 rounded-full border border-(--lagoon-deep) bg-(--lagoon) text-lg font-black text-white hover:opacity-90"
				>
					+
				</button>
			</div>
		</div>
	);
}

function EventsTab({
	matchId,
	sportId,
	live,
	events,
	participants,
}: {
	matchId: string;
	sportId: string;
	live: ReturnType<typeof useMatchLive>;
	events: MatchDetail["events"];
	participants: Array<{ id: string; name: string }>;
}) {
	const recordEvent = useRecordLiveEvent(api);
	// El catálogo de tipos de evento es del deporte, no del partido: la API
	// rechaza con 400 cualquier `eventType` que no esté en él.
	const { data: eventTypesData } = useSportEventTypes(api, sportId);
	const eventTypes =
		(
			eventTypesData as
				| {
						items: Array<{
							code: string;
							name: string;
							affectsScore: boolean;
							defaultValue: number;
						}>;
				  }
				| undefined
		)?.items ?? [];
	const [teamId, setTeamId] = React.useState(participants[0]?.id ?? "");
	const [eventType, setEventType] = React.useState("");
	const [periodNumber, setPeriodNumber] = React.useState(1);
	const [minuteOrSecond, setMinuteOrSecond] = React.useState(0);

	React.useEffect(() => {
		if (participants[0]) setTeamId(participants[0].id);
	}, [matchId, participants]);

	React.useEffect(() => {
		if (eventTypes.length === 0) return;
		if (!eventTypes.some((t) => t.code === eventType)) {
			setEventType(eventTypes[0]!.code);
		}
	}, [eventTypes, eventType]);

	const onSend = async (viaWs: boolean) => {
		if (!eventType) {
			toast.error(
				"No hay tipo de evento para registrar",
				"El deporte no tiene catálogo de eventos, o todavía no elegiste uno.",
			);
			return;
		}
		const payload = {
			teamId,
			eventType,
			periodNumber,
			minuteOrSecond,
		} as never;
		try {
			if (viaWs) {
				if (live.isOpen) {
					live.sendEvent(payload as never);
				} else {
					toast.error(
						"No se pudo registrar el evento por WS",
						"La conexión en vivo no está abierta; usa Registrar (REST).",
					);
					return;
				}
			} else {
				await recordEvent.mutateAsync({ id: matchId, body: payload });
				toast.success("Evento registrado");
			}
		} catch (err) {
			toast.error("No se pudo registrar el evento", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-4">
			<LiveBadge status={live.status} matchStatus="in_progress" />
			<div className="grid gap-2 sm:grid-cols-2">
				<div>
					<Label>Equipo</Label>
					<Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
						{participants.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
						{participants.length === 0 && <option value="">Sin equipos</option>}
					</Select>
				</div>
				<div>
					<Label htmlFor="match-event-type">Tipo de evento</Label>
					{eventTypes.length === 0 ? (
						<p className="text-xs text-(--sea-ink-soft)">
							El deporte no tiene tipos de evento configurados. Cargalos en la
							pantalla Deportes del admin, o corré `bun run db:seed:sports`.
						</p>
					) : (
						<Select
							id="match-event-type"
							value={eventType}
							onChange={(e) => setEventType(e.target.value)}
						>
							{eventTypes.map((t) => (
								<option key={t.code} value={t.code}>
									{t.name}
									{t.affectsScore ? ` · +${t.defaultValue}` : ""}
								</option>
							))}
						</Select>
					)}
				</div>
				<div>
					<Label>Periodo</Label>
					<Input
						type="number"
						value={periodNumber}
						onChange={(e) => setPeriodNumber(Number(e.target.value))}
						min={1}
					/>
				</div>
				<div>
					<Label>Minuto/Segundo</Label>
					<Input
						type="number"
						value={minuteOrSecond}
						onChange={(e) => setMinuteOrSecond(Number(e.target.value))}
						min={0}
					/>
				</div>
			</div>
			<div className="flex gap-2">
				<Button
					onClick={() => onSend(true)}
					disabled={!live.isOpen || !eventType}
				>
					Envío en vivo (WS)
				</Button>
				<Button
					variant="secondary"
					onClick={() => onSend(false)}
					disabled={recordEvent.isPending || !eventType}
				>
					{recordEvent.isPending ? "Enviando…" : "Registrar (REST)"}
				</Button>
			</div>

			<div>
				<Label>Cronología</Label>
				<div className="mt-2">
					{events.length === 0 ? (
						<p className="text-xs text-(--sea-ink-soft)">
							Sin eventos registrados todavía.
						</p>
					) : (
						<MatchTimeline
							events={events}
							teams={participants}
							labels={Object.fromEntries(
								eventTypes.map((t) => [t.code, t.name]),
							)}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function VenueTab({
	matchId,
	venueId,
}: {
	matchId: string;
	venueId: string | null;
}) {
	const { data: venuesData } = useVenues(api);
	const venues =
		(
			venuesData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];
	const assignVenue = useAssignVenue(api);
	const [selectedVenueId, setSelectedVenueId] = React.useState(venueId ?? "");
	React.useEffect(() => {
		setSelectedVenueId(venueId ?? "");
	}, [venueId]);
	const onAssign = async () => {
		try {
			await assignVenue.mutateAsync({
				id: matchId,
				venueId: selectedVenueId,
			} as never);
			toast.success("Sede asignada");
		} catch (err) {
			toast.error("No se pudo asignar la sede", getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-3">
			<div>
				<Label>Sede</Label>
				<Select
					value={selectedVenueId}
					onChange={(e) => setSelectedVenueId(e.target.value)}
				>
					<option value="">Sin sede</option>
					{venues.map((v) => (
						<option key={v.id} value={v.id}>
							{v.name}
						</option>
					))}
				</Select>
			</div>
			<Button
				icon={Plus}
				onClick={onAssign}
				disabled={assignVenue.isPending || !selectedVenueId}
			>
				{assignVenue.isPending ? "Asignando…" : "Asignar sede"}
			</Button>
		</div>
	);
}

function ScheduleTab({
	matchId,
	scheduledAt,
}: {
	matchId: string;
	scheduledAt: Date | string | null;
}) {
	const scheduleMatch = useScheduleMatch(api);
	const [dt, setDt] = React.useState(
		scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : "",
	);
	const onSchedule = async () => {
		try {
			const iso = new Date(dt).toISOString();
			await scheduleMatch.mutateAsync({
				id: matchId,
				scheduledAt: iso,
			} as never);
			toast.success("Partido programado");
		} catch (err) {
			toast.error("No se pudo programar el partido", getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-3">
			<div>
				<Label>Fecha y hora (local)</Label>
				<Input
					type="datetime-local"
					value={dt}
					onChange={(e) => setDt(e.target.value)}
				/>
			</div>
			<Button
				icon={Save}
				onClick={onSchedule}
				disabled={scheduleMatch.isPending || !dt}
			>
				{scheduleMatch.isPending ? "Programando…" : "Programar"}
			</Button>
			<div className="text-xs text-(--sea-ink-soft)">
				Actual: {scheduledAt ? new Date(scheduledAt).toLocaleString() : "—"}
			</div>
		</div>
	);
}

function InfoTab({
	matchId,
	status,
	onDeleted,
}: {
	matchId: string;
	status: string;
	onDeleted: () => void;
}) {
	const updateMatch = useUpdateMatch(api);
	const deleteMatch = useDeleteMatch(api);
	const confirm = useConfirm();
	const onCancel = async () => {
		try {
			await updateMatch.mutateAsync({
				id: matchId,
				body: { status: "cancelled" } as never,
			});
			toast.success("Partido cancelado");
		} catch (err) {
			toast.error("No se pudo cancelar el partido", getApiErrorMessage(err));
		}
	};
	const onDelete = async () => {
		const ok = await confirm({
			title: "Eliminar partido",
			description:
				"Se elimina el partido con su marcador y eventos. No se puede deshacer.",
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await deleteMatch.mutateAsync(matchId);
			onDeleted();
		} catch (err) {
			toast.error("No se pudo eliminar el partido", getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-3">
			<Card className="p-3">
				<p className="text-sm text-(--sea-ink-soft)">
					Estado actual: <Badge>{status}</Badge>
				</p>
				<p className="mt-1 text-xs text-(--sea-ink-soft)">
					Solo `cancelled` permitido vía PATCH /matches/:id (admin). Otros
					estados via score.
				</p>
				<Button
					variant="secondary"
					onClick={onCancel}
					disabled={updateMatch.isPending}
					className="mt-2"
				>
					{updateMatch.isPending ? "Cancelando…" : "Cancelar partido"}
				</Button>
			</Card>
			<Card className="p-3 border-[rgba(196,71,71,0.3)]">
				<h4 className="font-bold text-sm text-[#9f3030]">Zona peligrosa</h4>
				<Button
					variant="destructive"
					icon={Trash2}
					onClick={onDelete}
					disabled={deleteMatch.isPending}
					className="mt-2"
				>
					{deleteMatch.isPending ? "Eliminando…" : "Eliminar partido"}
				</Button>
			</Card>
		</div>
	);
}

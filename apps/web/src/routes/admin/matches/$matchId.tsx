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
	Select,
	Skeleton,
	toast,
	useConfirm,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
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
			<Link to="/admin/tournaments" className="text-sm text-(--sea-ink-soft)">
				← Admin
			</Link>

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
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Badge variant={live.isOpen ? "success" : "secondary"}>
					{live.status}
				</Badge>
				<span className="text-xs text-(--sea-ink-soft)">
					{live.lastAck ? `ack ${live.lastAck.action}` : "sin ack"}
				</span>
				<span className="text-xs text-(--sea-ink-soft)">
					{live.lastScore ? `score` : ""}
				</span>
			</div>
			<div className="flex flex-wrap gap-2">
				<Input
					type="number"
					value={homeScore}
					onChange={(e) => setHomeScore(Number(e.target.value))}
					className="w-20"
				/>
				<span className="self-center">:</span>
				<Input
					type="number"
					value={awayScore}
					onChange={(e) => setAwayScore(Number(e.target.value))}
					className="w-20"
				/>
				<Select value={status} onChange={(e) => setStatus(e.target.value)}>
					<option value="scheduled">scheduled</option>
					<option value="in_progress">in_progress</option>
					<option value="paused">paused</option>
					<option value="finished">finished</option>
					<option value="cancelled">cancelled</option>
					<option value="walkover">walkover</option>
				</Select>
			</div>
			<div className="flex gap-2">
				<Button onClick={onSendLive} disabled={!live.isOpen}>
					Enviar vía WS (live)
				</Button>
				<Button
					variant="secondary"
					onClick={onPatchScore}
					disabled={updateScore.isPending}
				>
					{updateScore.isPending ? "Guardando…" : "PATCH /score (REST)"}
				</Button>
			</div>
			{live.lastError && (
				<div className="demo-alert-danger text-sm">
					WS error: {live.lastError.message}
				</div>
			)}
			<div className="text-xs text-(--sea-ink-soft)">
				WS isOpen={String(live.isOpen)} isConnecting={String(live.isConnecting)}
			</div>
		</div>
	);
}

function EventsTab({
	matchId,
	participants,
}: {
	matchId: string;
	participants: Array<{ id: string; name: string }>;
}) {
	const recordEvent = useRecordLiveEvent(api);
	const live = useMatchLive(matchId, {
		getToken: getStoredAccessToken,
		updateCache: true,
	});
	const [teamId, setTeamId] = React.useState(participants[0]?.id ?? "");
	const [eventType, setEventType] = React.useState("goal");
	const [periodNumber, setPeriodNumber] = React.useState(1);
	const [minuteOrSecond, setMinuteOrSecond] = React.useState(0);

	React.useEffect(() => {
		if (participants[0]) setTeamId(participants[0].id);
	}, [matchId, participants]);

	const onSend = async (viaWs: boolean) => {
		const payload = {
			teamId,
			eventType,
			periodNumber,
			minuteOrSecond,
		} as never;
		try {
			if (viaWs) {
				live.sendEvent(payload as never);
			} else {
				await recordEvent.mutateAsync({ id: matchId, body: payload });
				toast.success("Evento registrado");
			}
		} catch (err) {
			toast.error("No se pudo registrar el evento", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Badge variant={live.isOpen ? "success" : "secondary"}>
					{live.status}
				</Badge>
				<span className="text-xs text-(--sea-ink-soft)">
					Envía evento vía WS (live) o REST (referee)
				</span>
			</div>
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
					<Label>Tipo evento</Label>
					<Input
						value={eventType}
						onChange={(e) => setEventType(e.target.value)}
						placeholder="goal, foul, yellow_card..."
					/>
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
				<Button onClick={() => onSend(true)} disabled={!live.isOpen}>
					Enviar WS
				</Button>
				<Button
					variant="secondary"
					onClick={() => onSend(false)}
					disabled={recordEvent.isPending}
				>
					{recordEvent.isPending ? "Enviando…" : "POST /events"}
				</Button>
			</div>
			{live.lastEvent && (
				<div className="demo-alert text-sm">
					Último evento WS: {JSON.stringify(live.lastEvent).slice(0, 200)}
				</div>
			)}
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
			<Button onClick={onSchedule} disabled={scheduleMatch.isPending || !dt}>
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

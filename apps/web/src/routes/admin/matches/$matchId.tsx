// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api, getStoredAccessToken } from "../../../lib/api";
import { queryKeys, getApiErrorMessage } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import {
	useUpdateMatchScore,
	useRecordLiveEvent,
	useAssignVenue,
	useScheduleMatch,
	useUpdateMatch,
	useDeleteMatch,
} from "@sports/api-client/hooks";
import { useMatchLive } from "@sports/api-client/live";
import { useTeams, useVenues } from "@sports/api-client/hooks";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Badge, Label } from "@sports/ui";
import { MatchCard } from "@sports/ui";
import * as React from "react";

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
	const match = matchData as
		| {
				id: string;
				stageId: string;
				groupId: string | null;
				homeTeamId: string | null;
				awayTeamId: string | null;
				homeScore: number;
				awayScore: number;
				status: string;
				venueId: string | null;
				scheduledAt: string | null;
				winnerTeamId?: string | null;
		  }
		| undefined;

	const { data: teamsData } = useTeams(api);
	const teams = (teamsData as { items: Array<{ id: string; name: string }>; total: number } | undefined)?.items ?? [];
	const getTeamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? (id ? id.slice(0, 8) : "—");

	const updateScore = useUpdateMatchScore(api);
	const recordEvent = useRecordLiveEvent(api);
	const assignVenue = useAssignVenue(api);
	const scheduleMatch = useScheduleMatch(api);
	const updateMatch = useUpdateMatch(api);
	const deleteMatch = useDeleteMatch(api);
	const live = useMatchLive(matchId, { getToken: getStoredAccessToken, updateCache: true });

	const [homeScore, setHomeScore] = React.useState(0);
	const [awayScore, setAwayScore] = React.useState(0);
	const [status, setStatus] = React.useState("in_progress");
	const [error, setError] = React.useState<string | null>(null);
	const [tab, setTab] = React.useState<"score" | "events" | "venue" | "schedule" | "info">("score");

	React.useEffect(() => {
		if (match) {
			setHomeScore(match.homeScore);
			setAwayScore(match.awayScore);
			setStatus(match.status);
		}
	}, [match]);

	const onSendLive = () => {
		setError(null);
		try {
			live.sendScore({ homeScore, awayScore, status });
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	const onPatchScore = async () => {
		setError(null);
		try {
			await updateScore.mutateAsync({ id: matchId, body: { homeScore, awayScore, status } as never });
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	if (!match) return <div className="demo-center text-sm">Cargando partido…</div>;

	return (
		<div className="space-y-6">
			<Link to="/admin/tournaments" className="text-sm text-[var(--sea-ink-soft)]">
				← Admin
			</Link>

			<MatchCard
				homeTeam={{ id: match.homeTeamId ?? "home", name: getTeamName(match.homeTeamId) }}
				awayTeam={{ id: match.awayTeamId ?? "away", name: getTeamName(match.awayTeamId) }}
				homeScore={match.homeScore}
				awayScore={match.awayScore}
				status={match.status as never}
				scheduledAt={match.scheduledAt}
				live={live.isOpen}
				roundLabel={match.groupId ? `Grupo ${match.groupId.slice(0, 6)}` : undefined}
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
							key={key}
							onClick={() => setTab(key)}
							className={`rounded-full border px-3 py-1.5 text-xs font-bold ${tab === key ? "bg-[var(--lagoon)] text-white border-[var(--lagoon-deep)]" : "bg-[var(--chip-bg)] text-[var(--sea-ink-soft)] border-[var(--line)]"}`}
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
							error={error}
							setError={setError}
						/>
					)}
					{tab === "events" && <EventsTab matchId={matchId} homeTeamId={match.homeTeamId} awayTeamId={match.awayTeamId} teams={teams} />}
					{tab === "venue" && <VenueTab matchId={matchId} venueId={match.venueId} />}
					{tab === "schedule" && <ScheduleTab matchId={matchId} scheduledAt={match.scheduledAt} />}
					{tab === "info" && <InfoTab matchId={matchId} status={match.status} onDeleted={() => navigate({ to: "/admin/tournaments" })} />}
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
	error,
	setError: _setError,
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
	error: string | null;
	setError: (s: string | null) => void;
}) {
	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Badge variant={live.isOpen ? "success" : "secondary"}>{live.status}</Badge>
				<span className="text-xs text-[var(--sea-ink-soft)]">{live.lastAck ? `ack ${live.lastAck.action}` : "sin ack"}</span>
				<span className="text-xs text-[var(--sea-ink-soft)]">{live.lastScore ? `score` : ""}</span>
			</div>
			<div className="flex flex-wrap gap-2">
				<Input type="number" value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} className="w-20" />
				<span className="self-center">:</span>
				<Input type="number" value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} className="w-20" />
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
				<Button variant="secondary" onClick={onPatchScore} disabled={updateScore.isPending}>
					{updateScore.isPending ? "Guardando…" : "PATCH /score (REST)"}
				</Button>
			</div>
			{error && <div className="demo-alert-danger text-sm">{error}</div>}
			{live.lastError && <div className="demo-alert-danger text-sm">WS error: {live.lastError.message}</div>}
			<div className="text-xs text-[var(--sea-ink-soft)]">WS isOpen={String(live.isOpen)} isConnecting={String(live.isConnecting)}</div>
		</div>
	);
}

function EventsTab({
	matchId,
	homeTeamId,
	awayTeamId,
	teams,
}: {
	matchId: string;
	homeTeamId: string | null;
	awayTeamId: string | null;
	teams: Array<{ id: string; name: string }>;
}) {
	const recordEvent = useRecordLiveEvent(api);
	const live = useMatchLive(matchId, { getToken: getStoredAccessToken, updateCache: true });
	const [teamId, setTeamId] = React.useState(homeTeamId ?? "");
	const [eventType, setEventType] = React.useState("goal");
	const [periodNumber, setPeriodNumber] = React.useState(1);
	const [minuteOrSecond, setMinuteOrSecond] = React.useState(0);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (homeTeamId) setTeamId(homeTeamId);
	}, [homeTeamId]);

	const onSend = async (viaWs: boolean) => {
		setError(null);
		const payload = { teamId, eventType, periodNumber, minuteOrSecond } as never;
		try {
			if (viaWs) {
				live.sendEvent(payload as never);
			} else {
				await recordEvent.mutateAsync({ id: matchId, body: payload });
			}
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<Badge variant={live.isOpen ? "success" : "secondary"}>{live.status}</Badge>
				<span className="text-xs text-[var(--sea-ink-soft)]">Envía evento vía WS (live) o REST (referee)</span>
			</div>
			<div className="grid gap-2 sm:grid-cols-2">
				<div>
					<Label>Equipo</Label>
					<Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
						{teams
							.filter((t) => t.id === homeTeamId || t.id === awayTeamId)
							.map((t) => (
								<option key={t.id} value={t.id}>{t.name}</option>
							))}
						{!homeTeamId && !awayTeamId && <option value="">Sin equipos</option>}
					</Select>
				</div>
				<div>
					<Label>Tipo evento</Label>
					<Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="goal, foul, yellow_card..." />
				</div>
				<div>
					<Label>Periodo</Label>
					<Input type="number" value={periodNumber} onChange={(e) => setPeriodNumber(Number(e.target.value))} min={1} />
				</div>
				<div>
					<Label>Minuto/Segundo</Label>
					<Input type="number" value={minuteOrSecond} onChange={(e) => setMinuteOrSecond(Number(e.target.value))} min={0} />
				</div>
			</div>
			<div className="flex gap-2">
				<Button onClick={() => onSend(true)} disabled={!live.isOpen}>Enviar WS</Button>
				<Button variant="secondary" onClick={() => onSend(false)} disabled={recordEvent.isPending}>
					{recordEvent.isPending ? "Enviando…" : "POST /events"}
				</Button>
			</div>
			{error && <div className="demo-alert-danger text-sm">{error}</div>}
			{live.lastEvent && <div className="demo-alert text-sm">Último evento WS: {JSON.stringify(live.lastEvent).slice(0, 200)}</div>}
			{recordEvent.isSuccess && <div className="demo-alert text-sm">Evento registrado</div>}
		</div>
	);
}

function VenueTab({ matchId, venueId }: { matchId: string; venueId: string | null }) {
	const { data: venuesData } = useVenues(api);
	const venues = (venuesData as { items: Array<{ id: string; name: string }>; total: number } | undefined)?.items ?? [];
	const assignVenue = useAssignVenue(api);
	const [selectedVenueId, setSelectedVenueId] = React.useState(venueId ?? "");
	const [error, setError] = React.useState<string | null>(null);
	React.useEffect(() => { setSelectedVenueId(venueId ?? ""); }, [venueId]);
	const onAssign = async () => {
		setError(null);
		try {
			await assignVenue.mutateAsync({ id: matchId, venueId: selectedVenueId } as never);
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-3">
			<div>
				<Label>Sede</Label>
				<Select value={selectedVenueId} onChange={(e) => setSelectedVenueId(e.target.value)}>
					<option value="">Sin sede</option>
					{venues.map((v) => (
						<option key={v.id} value={v.id}>{v.name}</option>
					))}
				</Select>
			</div>
			<Button onClick={onAssign} disabled={assignVenue.isPending || !selectedVenueId}>
				{assignVenue.isPending ? "Asignando…" : "Asignar sede"}
			</Button>
			{error && <div className="demo-alert-danger text-sm">{error}</div>}
			{assignVenue.isSuccess && <div className="demo-alert text-sm">Sede asignada</div>}
		</div>
	);
}

function ScheduleTab({ matchId, scheduledAt }: { matchId: string; scheduledAt: string | null }) {
	const scheduleMatch = useScheduleMatch(api);
	const [dt, setDt] = React.useState(scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : "");
	const [error, setError] = React.useState<string | null>(null);
	const onSchedule = async () => {
		setError(null);
		try {
			const iso = new Date(dt).toISOString();
			await scheduleMatch.mutateAsync({ id: matchId, scheduledAt: iso } as never);
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-3">
			<div>
				<Label>Fecha y hora (local)</Label>
				<Input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} />
			</div>
			<Button onClick={onSchedule} disabled={scheduleMatch.isPending || !dt}>
				{scheduleMatch.isPending ? "Programando…" : "Programar"}
			</Button>
			{error && <div className="demo-alert-danger text-sm">{error}</div>}
			{scheduleMatch.isSuccess && <div className="demo-alert text-sm">Programado</div>}
			<div className="text-xs text-[var(--sea-ink-soft)]">Actual: {scheduledAt ?? "—"}</div>
		</div>
	);
}

function InfoTab({ matchId, status, onDeleted }: { matchId: string; status: string; onDeleted: () => void }) {
	const updateMatch = useUpdateMatch(api);
	const deleteMatch = useDeleteMatch(api);
	const [error, setError] = React.useState<string | null>(null);
	const onCancel = async () => {
		setError(null);
		try {
			await updateMatch.mutateAsync({ id: matchId, body: { status: "cancelled" } as never });
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};
	const onDelete = async () => {
		if (!confirm("¿Eliminar partido?")) return;
		setError(null);
		try {
			await deleteMatch.mutateAsync(matchId);
			onDeleted();
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-3">
			<Card className="p-3">
				<p className="text-sm text-[var(--sea-ink-soft)]">Estado actual: <Badge>{status}</Badge></p>
				<p className="mt-1 text-xs text-[var(--sea-ink-soft)]">Solo `cancelled` permitido vía PATCH /matches/:id (admin). Otros estados via score.</p>
				<Button variant="secondary" onClick={onCancel} disabled={updateMatch.isPending} className="mt-2">
					{updateMatch.isPending ? "Cancelando…" : "Cancelar partido"}
				</Button>
			</Card>
			<Card className="p-3 border-[rgba(196,71,71,0.3)]">
				<h4 className="font-bold text-sm text-[#9f3030]">Zona peligrosa</h4>
				<Button variant="destructive" onClick={onDelete} disabled={deleteMatch.isPending} className="mt-2">
					{deleteMatch.isPending ? "Eliminando…" : "Eliminar partido"}
				</Button>
			</Card>
			{error && <div className="demo-alert-danger text-sm">{error}</div>}
			{(updateMatch.isSuccess || deleteMatch.isSuccess) && <div className="demo-alert text-sm">Operación exitosa</div>}
		</div>
	);
}

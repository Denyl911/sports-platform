import {
	type CreateMatch,
	type FixtureGenerationResult,
	type GenerateFixture,
	getApiErrorMessage,
	type StageFixture as StageFixtureResponse,
	type UpdateMatchInfo,
} from "@sports/api-client";
import {
	useCreateMatch,
	useGenerateFixture,
	useStageFixture,
	useUpdateMatch,
	useVenues,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	CalendarClock,
	Card,
	EditDialog,
	EmptyState,
	ExternalLink,
	Field,
	Input,
	Pencil,
	Plus,
	RefreshCw,
	Save,
	Select,
	Skeleton,
	Sparkles,
	Swords,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Trash2,
	toast,
} from "@sports/ui";
import { Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../lib/api";
import {
	compareFixtureItems,
	formatDateKey,
	formatDay,
	formatTime,
	groupByMatchday,
	localDateKey,
	localDateTimeInput,
	localTimeKey,
	type Matchday,
	matchdayDateLabel,
	toDate,
	todayLocalDate,
} from "../lib/fixture-date";
import {
	MATCH_STATUS_LABELS,
	type MatchStatusLike,
	matchStatusBadgeVariant,
} from "./live-ui";

type FixtureItem = StageFixtureResponse["items"][number];
type VenueOption = { id: string; name: string; fieldCount: number };
type GroupOption = { id: string; name: string };
type RegistrationOption = {
	registration: { groupId: string | null };
	team: { id: string; name: string };
};
type TimeSlot = { id: string; value: string };

function matchStatus(match: FixtureItem): MatchStatusLike {
	return match.status as MatchStatusLike;
}

function hasStarted(match: FixtureItem): boolean {
	const status = matchStatus(match);
	return (
		status === "in_progress" ||
		status === "paused" ||
		status === "finished" ||
		status === "walkover"
	);
}

function teamName(team: { name: string } | null): string {
	return team?.name ?? "Por definir";
}

interface FixtureDefaults {
	startDate: string;
	intervalDays: number;
	times: string[];
	venueId: string;
	fieldNumbers: number[];
	doubleRound: boolean;
}

function buildFixtureDefaults(items: FixtureItem[]): FixtureDefaults {
	const scheduled = [...items]
		.filter((item) => item.scheduledAt)
		.sort(compareFixtureItems);
	const first = scheduled[0];
	const times = Array.from(
		new Set(
			scheduled
				.map((item) => localTimeKey(item.scheduledAt))
				.filter((time): time is string => time !== null),
		),
	)
		.sort()
		.slice(0, 12);
	const venueId = scheduled.find((item) => item.venueId)?.venueId ?? "";
	const fieldNumbers = Array.from(
		new Set(
			scheduled
				.filter((item) => item.venueId === venueId && item.fieldNumber !== null)
				.map((item) => item.fieldNumber as number),
		),
	).sort((a, b) => a - b);
	const playedPairs = new Set<string>();
	let doubleRound = false;
	for (const item of items) {
		if (!item.homeTeamId || !item.awayTeamId) continue;
		const key = [item.homeTeamId, item.awayTeamId].sort().join(":");
		if (playedPairs.has(key)) {
			doubleRound = true;
			break;
		}
		playedPairs.add(key);
	}
	return {
		startDate: (first && localDateKey(first.scheduledAt)) ?? todayLocalDate(),
		intervalDays: 7,
		times: times.length > 0 ? times : ["09:00"],
		venueId,
		fieldNumbers,
		doubleRound,
	};
}

function fieldsOf(venue: VenueOption | null): number[] {
	if (!venue || venue.fieldCount <= 0) return [];
	return Array.from({ length: venue.fieldCount }, (_, index) => index + 1);
}

/**
 * Mesa del fixture de una etapa: agrupa los partidos por jornada, permite
 * generarlos desde la fecha de inicio y ajustar fecha, sede y cancha por fila
 * o por jornada completa. La lectura es el fixture sin paginar de la etapa:
 * `GET /matches` tiene límite y truncaría una liguilla grande.
 */
export function StageFixture({
	stageId,
	tournamentId,
	stageType,
	groups,
	registrations,
}: {
	stageId: string;
	tournamentId: string | null;
	stageType?: string | null;
	groups: GroupOption[];
	registrations: RegistrationOption[];
}) {
	const { data, isPending, isError } = useStageFixture(api, stageId);
	const { data: venuesData } = useVenues(api, { limit: 100 });
	const fixture = (data as StageFixtureResponse | undefined)?.items ?? [];
	const venues =
		(venuesData as { items: VenueOption[] } | undefined)?.items ?? [];
	const matchdays = React.useMemo(() => groupByMatchday(fixture), [fixture]);
	const defaults = React.useMemo(
		() => buildFixtureDefaults(fixture),
		[fixture],
	);
	const groupNameById = React.useMemo(
		() => new Map(groups.map((group) => [group.id, group.name])),
		[groups],
	);
	const hasGroupColumn =
		groups.length > 0 || fixture.some((item) => item.groupId !== null);

	const resolvedStageType = stageType ?? "round_robin";
	const supportsAutoGeneration = resolvedStageType === "round_robin";
	const supportsBracket = resolvedStageType === "single_elimination";
	const isKnockout =
		resolvedStageType === "single_elimination" ||
		resolvedStageType === "double_elimination";
	const supportsManualAdd = !supportsAutoGeneration;
	const roundLabel = isKnockout ? "Ronda" : "Jornada";

	const groupCounts = new Map<string, number>();
	for (const item of registrations) {
		const groupId = item.registration.groupId;
		if (groupId) groupCounts.set(groupId, (groupCounts.get(groupId) ?? 0) + 1);
	}
	const unassignedCount = registrations.filter(
		(item) => item.registration.groupId === null,
	).length;
	const emptyGroup = groups.find(
		(group) => (groupCounts.get(group.id) ?? 0) < 2,
	);
	const generationBlockedReason =
		registrations.length < 2
			? "Necesitas al menos 2 equipos inscritos para generar el fixture."
			: groups.length > 0 && unassignedCount > 0
				? `Asigna un grupo a ${unassignedCount} equipo(s) antes de generar.`
				: emptyGroup
					? `El grupo «${emptyGroup.name}» necesita al menos 2 equipos.`
					: null;
	const canGenerate =
		supportsAutoGeneration && generationBlockedReason === null;

	const [generateOpen, setGenerateOpen] = React.useState(false);
	const [editing, setEditing] = React.useState<FixtureItem | null>(null);
	const [moving, setMoving] = React.useState<Matchday<FixtureItem> | null>(
		null,
	);
	const [adding, setAdding] = React.useState(false);

	const scheduledCount = fixture.filter((item) => item.scheduledAt).length;
	const unscheduledCount = fixture.length - scheduledCount;

	return (
		<Card className="p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h3 className="font-bold">
						{isKnockout ? "Partidos de la llave" : "Fixture"}
					</h3>
					<p className="mt-1 max-w-2xl text-sm text-(--sea-ink-soft)">
						{isKnockout
							? supportsBracket
								? "Los cruces de la llave se generan desde la sección Avance. Acá se ajusta la fecha, la sede y la cancha de cada partido."
								: "Esta etapa de eliminación no tiene generación automática de llave. Agrega los cruces a mano y ajusta su fecha, sede y cancha."
							: supportsAutoGeneration
								? "El fixture se genera automáticamente por jornada y se agrupa por fecha. Ajusta la fecha, la sede y la cancha de cada partido cuando haga falta."
								: "Esta etapa no genera fixture automático. Agrega los partidos a mano y después ajusta su fecha, sede y cancha desde la tabla."}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{supportsManualAdd && (
						<Button
							variant="outline"
							icon={Plus}
							onClick={() => setAdding(true)}
							disabled={registrations.length < 2 || !tournamentId}
							title={
								!tournamentId
									? "Vuelve a la edición para conservar el torneo en la URL."
									: undefined
							}
						>
							Agregar partido
						</Button>
					)}
					{supportsAutoGeneration && (
						<Button
							icon={fixture.length > 0 ? RefreshCw : Sparkles}
							onClick={() => setGenerateOpen(true)}
							disabled={!canGenerate}
							title={generationBlockedReason ?? undefined}
						>
							{fixture.length > 0 ? "Regenerar fixture" : "Generar fixture"}
						</Button>
					)}
				</div>
			</div>

			{supportsAutoGeneration && generationBlockedReason && (
				<p className="mt-3 rounded-xl border border-(--line) bg-(--chip-bg) p-3 text-sm text-(--sea-ink-soft)">
					{generationBlockedReason}
				</p>
			)}
			{!supportsAutoGeneration && !isKnockout && (
				<p className="mt-3 rounded-xl border border-(--line) bg-(--chip-bg) p-3 text-sm text-(--sea-ink-soft)">
					Esta etapa no genera fixture automático. Agrega los partidos a mano y
					después ajusta su fecha, sede y cancha desde la tabla.
				</p>
			)}

			{isError ? (
				<EmptyState
					title="No se pudo cargar el fixture"
					description="Vuelve a intentar en unos segundos."
					icon={Swords}
					className="mt-4"
				/>
			) : isPending ? (
				<div className="mt-4 space-y-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : fixture.length === 0 ? (
				<EmptyState
					title="Sin partidos todavía"
					description={
						supportsAutoGeneration
							? "Genera el fixture para repartir los cruces por jornada y fecha."
							: isKnockout
								? supportsBracket
									? "Genera la llave desde la sección Avance."
									: "Agrega los cruces de esta etapa a mano."
								: "Agrega los partidos de esta etapa a mano."
					}
					icon={Swords}
					className="mt-4"
				/>
			) : (
				<>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<Badge variant="secondary">{fixture.length} partidos</Badge>
						<Badge variant="secondary">
							{matchdays.length} {isKnockout ? "rondas" : "jornadas"}
						</Badge>
						{unscheduledCount > 0 && (
							<Badge variant="outline">{unscheduledCount} sin fecha</Badge>
						)}
					</div>
					<div className="mt-4 space-y-6">
						{matchdays.map((matchday) => (
							<MatchdayTable
								key={matchday.roundNumber}
								matchday={matchday}
								roundLabel={roundLabel}
								hasGroupColumn={hasGroupColumn}
								groupNameById={groupNameById}
								onEdit={setEditing}
								onMove={setMoving}
							/>
						))}
					</div>
				</>
			)}

			{generateOpen && (
				<GenerateFixtureDialog
					stageId={stageId}
					existingCount={fixture.length}
					defaults={defaults}
					venues={venues}
					onClose={() => setGenerateOpen(false)}
				/>
			)}
			{editing && (
				<EditMatchDialog
					match={editing}
					venues={venues}
					roundLabel={roundLabel}
					onClose={() => setEditing(null)}
				/>
			)}
			{moving && (
				<MoveMatchdayDialog
					matchday={moving}
					roundLabel={roundLabel}
					onClose={() => setMoving(null)}
				/>
			)}
			{adding && tournamentId && (
				<AddMatchDialog
					stageId={stageId}
					tournamentId={tournamentId}
					groups={groups}
					registrations={registrations}
					roundLabel={roundLabel}
					onClose={() => setAdding(false)}
				/>
			)}
		</Card>
	);
}

function MatchdayTable({
	matchday,
	roundLabel,
	hasGroupColumn,
	groupNameById,
	onEdit,
	onMove,
}: {
	matchday: Matchday<FixtureItem>;
	roundLabel: string;
	hasGroupColumn: boolean;
	groupNameById: Map<string, string>;
	onEdit: (match: FixtureItem) => void;
	onMove: (matchday: Matchday<FixtureItem>) => void;
}) {
	const scheduledCount = matchday.items.filter(
		(item) => item.scheduledAt,
	).length;
	return (
		<section>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<h4 className="text-sm font-bold">
						{roundLabel} {matchday.roundNumber}
					</h4>
					<span className="text-xs text-(--sea-ink-soft)">
						{matchdayDateLabel(matchday.items)}
					</span>
					<Badge variant="outline">{matchday.items.length} partidos</Badge>
				</div>
				<Button
					variant="ghost"
					size="sm"
					icon={CalendarClock}
					onClick={() => onMove(matchday)}
					disabled={scheduledCount === 0}
					title={
						scheduledCount === 0
							? "No hay partidos con fecha en esta jornada."
							: "Mueve todos los partidos de esta jornada a otra fecha."
					}
				>
					Reprogramar
				</Button>
			</div>
			<Table className="mt-2">
				<TableHeader>
					<TableRow>
						<TableHead className="w-12">#</TableHead>
						<TableHead>Partido</TableHead>
						{hasGroupColumn && <TableHead>Grupo</TableHead>}
						<TableHead>Fecha y hora</TableHead>
						<TableHead>Sede y cancha</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead className="text-right">Acciones</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{matchday.items.map((match) => {
						const status = matchStatus(match);
						const started = hasStarted(match);
						const groupName = match.groupId
							? (groupNameById.get(match.groupId) ?? "Grupo")
							: null;
						const date = toDate(match.scheduledAt);
						return (
							<TableRow key={match.id}>
								<TableCell className="text-(--sea-ink-soft)">
									{match.matchNumber ?? "—"}
								</TableCell>
								<TableCell>
									<div className="min-w-52 space-y-0.5">
										<div className="flex items-center justify-between gap-3">
											<span className="font-semibold">
												{teamName(match.homeTeam)}
											</span>
											<span className="tabular-nums text-(--sea-ink-soft)">
												{started ? match.homeScore : ""}
											</span>
										</div>
										<div className="flex items-center justify-between gap-3">
											<span className="font-semibold">
												{teamName(match.awayTeam)}
											</span>
											<span className="tabular-nums text-(--sea-ink-soft)">
												{started ? match.awayScore : ""}
											</span>
										</div>
									</div>
								</TableCell>
								{hasGroupColumn && (
									<TableCell>
										{groupName ? (
											<Badge variant="secondary">{groupName}</Badge>
										) : (
											<span className="text-(--sea-ink-soft)">—</span>
										)}
									</TableCell>
								)}
								<TableCell>
									{date ? (
										<div className="space-y-0.5">
											<div className="font-semibold">{formatDay(date)}</div>
											<div className="text-(--sea-ink-soft)">
												{formatTime(date)}
											</div>
										</div>
									) : (
										<span className="text-(--sea-ink-soft)">Sin fecha</span>
									)}
								</TableCell>
								<TableCell>
									{match.venue ? (
										<div className="space-y-0.5">
											<div className="font-semibold">{match.venue.name}</div>
											<div className="text-(--sea-ink-soft)">
												{match.fieldNumber
													? `Cancha ${match.fieldNumber}`
													: "Sin cancha"}
											</div>
										</div>
									) : (
										<span className="text-(--sea-ink-soft)">Sin sede</span>
									)}
								</TableCell>
								<TableCell>
									<Badge variant={matchStatusBadgeVariant(status)}>
										{MATCH_STATUS_LABELS[status] ?? status}
									</Badge>
								</TableCell>
								<TableCell>
									<div className="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											icon={Pencil}
											aria-label={`Editar ${teamName(match.homeTeam)} contra ${teamName(match.awayTeam)}`}
											title="Editar fecha, sede y cancha"
											onClick={() => onEdit(match)}
										/>
										<Link
											to="/admin/matches/$matchId"
											params={{ matchId: match.id }}
											className="no-underline"
										>
											<Button
												variant="outline"
												size="sm"
												icon={ExternalLink}
												aria-label={`Abrir ${teamName(match.homeTeam)} contra ${teamName(match.awayTeam)}`}
											>
												Abrir
											</Button>
										</Link>
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</section>
	);
}

function GenerateFixtureDialog({
	stageId,
	existingCount,
	defaults,
	venues,
	onClose,
}: {
	stageId: string;
	existingCount: number;
	defaults: FixtureDefaults;
	venues: VenueOption[];
	onClose: () => void;
}) {
	const generate = useGenerateFixture(api);
	const initialVenue =
		venues.find((venue) => venue.id === defaults.venueId) ?? null;
	const initialFields = defaults.fieldNumbers.filter(
		(field) => field <= (initialVenue?.fieldCount ?? 0),
	);
	const [startDate, setStartDate] = React.useState(defaults.startDate);
	const [intervalDays, setIntervalDays] = React.useState(
		String(defaults.intervalDays),
	);
	const [times, setTimes] = React.useState<TimeSlot[]>(() =>
		(defaults.times.length > 0 ? defaults.times : ["09:00"]).map(
			(value, index) => ({ id: `time-${index}`, value }),
		),
	);
	const nextTimeId = React.useRef(Math.max(defaults.times.length, 1));
	const [duration, setDuration] = React.useState("60");
	const [venueId, setVenueId] = React.useState(defaults.venueId);
	const [selectedFields, setSelectedFields] = React.useState<number[]>(
		initialFields.length > 0 ? initialFields : fieldsOf(initialVenue),
	);
	const [doubleRound, setDoubleRound] = React.useState(defaults.doubleRound);
	const [replaceExisting, setReplaceExisting] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

	const onVenueChange = (nextId: string) => {
		setVenueId(nextId);
		const venue = venues.find((item) => item.id === nextId) ?? null;
		setSelectedFields(fieldsOf(venue));
	};

	const toggleField = (field: number) => {
		setSelectedFields((current) =>
			current.includes(field)
				? current.filter((item) => item !== field)
				: [...current, field].sort((a, b) => a - b),
		);
	};

	const setTimeAt = (index: number, value: string) => {
		setTimes((current) =>
			current.map((slot, position) =>
				position === index ? { ...slot, value } : slot,
			),
		);
	};

	const removeTimeAt = (index: number) => {
		setTimes((current) => current.filter((_, position) => position !== index));
	};

	const addTime = () => {
		setTimes((current) => [
			...current,
			{ id: `time-${nextTimeId.current++}`, value: "12:00" },
		]);
	};

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setError(null);
		if (!startDate) {
			setError("Elige la fecha de inicio.");
			return;
		}
		if (times.length === 0 || times.some((slot) => !slot.value)) {
			setError("Agrega al menos una hora de inicio.");
			return;
		}
		const timeValues = times.map((slot) => slot.value);
		if (new Set(timeValues).size !== timeValues.length) {
			setError("Las horas de inicio no pueden repetirse.");
			return;
		}
		const days = Number(intervalDays);
		if (!Number.isInteger(days) || days < 0 || days > 365) {
			setError("El intervalo debe ser un número entero entre 0 y 365 días.");
			return;
		}
		const minutes = Number(duration);
		if (!Number.isInteger(minutes) || minutes < 15 || minutes > 240) {
			setError("La duración debe estar entre 15 y 240 minutos.");
			return;
		}
		if (venueId && selectedFields.length === 0) {
			setError("Elige al menos una cancha de la sede.");
			return;
		}
		if (existingCount > 0 && !replaceExisting) {
			setError("Confirma que quieres reemplazar el fixture actual.");
			return;
		}
		const body: GenerateFixture = {
			startDate,
			intervalDays: days,
			kickoffTimes: timeValues,
			matchDurationMinutes: minutes,
			timeZone,
			doubleRound,
			venueId: venueId || null,
			fieldNumbers: venueId ? selectedFields : undefined,
		};
		try {
			const result = (await generate.mutateAsync({
				stageId,
				body,
				force: existingCount > 0,
			})) as FixtureGenerationResult;
			toast.success(
				`Fixture generado: ${result.matches} partidos en ${result.matchdays} jornadas`,
			);
			if (result.warnings.length > 0) {
				toast.info("Revisa la programación", result.warnings.join(" · "));
			}
			onClose();
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			wide
			title={existingCount > 0 ? "Regenerar fixture" : "Generar fixture"}
			description="La API reparte los cruces por jornada y asigna fecha, hora, sede y cancha con los valores que elijas."
			error={error}
			footer={
				<>
					<Button variant="secondary" type="button" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="fixture-generate-form"
						icon={Save}
						disabled={
							generate.isPending || (existingCount > 0 && !replaceExisting)
						}
					>
						{generate.isPending ? "Generando…" : "Generar"}
					</Button>
				</>
			}
		>
			<form
				id="fixture-generate-form"
				onSubmit={onSubmit}
				className="space-y-4"
			>
				{existingCount > 0 && (
					<div className="rounded-xl border border-[rgba(196,71,71,0.3)] bg-[rgba(196,71,71,0.08)] p-3 text-sm text-(--sea-ink)">
						<p>
							Ya hay {existingCount} partidos. Regenerar reemplaza el fixture
							actual; la API lo rechaza si algún partido ya empezó o si hay una
							llave vinculada.
						</p>
						<label className="mt-2 flex items-center gap-2 font-semibold">
							<input
								type="checkbox"
								checked={replaceExisting}
								onChange={(event) => setReplaceExisting(event.target.checked)}
							/>
							Reemplazar el fixture actual
						</label>
					</div>
				)}

				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Fecha de inicio" htmlFor="fixture-start-date">
						<Input
							id="fixture-start-date"
							type="date"
							value={startDate}
							onChange={(event) => setStartDate(event.target.value)}
							required
						/>
					</Field>
					<Field
						label="Días entre jornadas"
						htmlFor="fixture-interval"
						hint="0 las programa todas en la misma fecha."
					>
						<Input
							id="fixture-interval"
							type="number"
							min={0}
							max={365}
							value={intervalDays}
							onChange={(event) => setIntervalDays(event.target.value)}
						/>
					</Field>
					<Field label="Duración del partido (min)" htmlFor="fixture-duration">
						<Input
							id="fixture-duration"
							type="number"
							min={15}
							max={240}
							step={5}
							value={duration}
							onChange={(event) => setDuration(event.target.value)}
						/>
					</Field>
					<Field
						label="Sede"
						htmlFor="fixture-venue"
						hint={
							selectedVenue && selectedVenue.fieldCount === 0
								? "La sede no tiene canchas configuradas."
								: undefined
						}
					>
						<Select
							id="fixture-venue"
							value={venueId}
							onChange={(event) => onVenueChange(event.target.value)}
						>
							<option value="">Sin sede</option>
							{venues.map((venue) => (
								<option key={venue.id} value={venue.id}>
									{venue.name}
								</option>
							))}
						</Select>
					</Field>
				</div>

				<div className="space-y-2">
					<p className="text-sm font-semibold text-(--sea-ink)">
						Horas de inicio
					</p>
					{times.map((slot, index) => (
						<div key={slot.id} className="flex items-end gap-2">
							<Field
								label={`Hora ${index + 1}`}
								htmlFor={`fixture-time-${slot.id}`}
								className="flex-1"
							>
								<Input
									id={`fixture-time-${slot.id}`}
									type="time"
									step={300}
									value={slot.value}
									onChange={(event) => setTimeAt(index, event.target.value)}
									required
								/>
							</Field>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								icon={Trash2}
								aria-label={`Quitar hora ${index + 1}`}
								onClick={() => removeTimeAt(index)}
								disabled={times.length === 1}
							/>
						</div>
					))}
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							icon={Plus}
							onClick={addTime}
							disabled={times.length >= 12}
						>
							Agregar hora
						</Button>
						<span className="text-xs text-(--sea-ink-soft)">
							Se usan en orden; si no alcanzan, el fixture repite el día
							siguiente. Zona horaria: {timeZone}.
						</span>
					</div>
				</div>

				{venueId && selectedVenue && selectedVenue.fieldCount > 0 && (
					<div className="space-y-2">
						<p className="text-sm font-semibold text-(--sea-ink)">
							Canchas de {selectedVenue.name}
						</p>
						<div className="flex flex-wrap gap-1.5">
							{fieldsOf(selectedVenue).map((field) => {
								const active = selectedFields.includes(field);
								return (
									<Button
										key={field}
										type="button"
										variant={active ? "default" : "outline"}
										size="sm"
										aria-pressed={active}
										onClick={() => toggleField(field)}
									>
										Cancha {field}
									</Button>
								);
							})}
						</div>
					</div>
				)}

				<label className="flex items-start gap-2 text-sm text-(--sea-ink)">
					<input
						type="checkbox"
						className="mt-1"
						checked={doubleRound}
						onChange={(event) => setDoubleRound(event.target.checked)}
					/>
					<span>
						<span className="font-semibold">Ida y vuelta</span>
						<span className="block text-(--sea-ink-soft)">
							Cada par juega dos veces; duplica los partidos y las jornadas.
						</span>
					</span>
				</label>
			</form>
		</EditDialog>
	);
}

function EditMatchDialog({
	match,
	venues,
	roundLabel,
	onClose,
}: {
	match: FixtureItem;
	venues: VenueOption[];
	roundLabel: string;
	onClose: () => void;
}) {
	const updateMatch = useUpdateMatch(api);
	const [roundNumber, setRoundNumber] = React.useState(
		String(match.roundNumber),
	);
	const [scheduledAt, setScheduledAt] = React.useState(
		localDateTimeInput(match.scheduledAt),
	);
	const [venueId, setVenueId] = React.useState(match.venueId ?? "");
	const [fieldNumber, setFieldNumber] = React.useState<number | null>(
		match.fieldNumber ?? null,
	);
	const [error, setError] = React.useState<string | null>(null);

	const selectedVenue = venues.find((venue) => venue.id === venueId) ?? null;

	const onVenueChange = (nextId: string) => {
		setVenueId(nextId);
		if (!nextId) {
			setFieldNumber(null);
			return;
		}
		const venue = venues.find((item) => item.id === nextId) ?? null;
		const fields = fieldsOf(venue);
		setFieldNumber((current) =>
			current !== null && fields.includes(current)
				? current
				: (fields[0] ?? null),
		);
	};

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setError(null);
		const round = Number(roundNumber);
		if (!Number.isInteger(round) || round < 1) {
			setError(`${roundLabel} debe ser un número entero mayor o igual a 1.`);
			return;
		}
		let iso: string | null = null;
		if (scheduledAt) {
			const date = new Date(scheduledAt);
			if (Number.isNaN(date.getTime())) {
				setError("La fecha y hora no son válidas.");
				return;
			}
			iso = date.toISOString();
		}
		if (venueId && !fieldNumber) {
			setError("Elige una cancha o quita la sede.");
			return;
		}
		const body: UpdateMatchInfo = {
			roundNumber: round,
			scheduledAt: iso,
			venueId: venueId || null,
			fieldNumber: venueId ? fieldNumber : null,
		};
		try {
			await updateMatch.mutateAsync({ id: match.id, body });
			toast.success("Partido actualizado");
			onClose();
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`${teamName(match.homeTeam)} vs ${teamName(match.awayTeam)}`}
			description={`Fecha, hora, sede, cancha y ${roundLabel.toLowerCase()} del partido.`}
			error={error}
			footer={
				<>
					<Button variant="secondary" type="button" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="fixture-match-form"
						icon={Save}
						disabled={updateMatch.isPending}
					>
						{updateMatch.isPending ? "Guardando…" : "Guardar"}
					</Button>
				</>
			}
		>
			<form id="fixture-match-form" onSubmit={onSubmit} className="space-y-4">
				<Field
					label={roundLabel}
					htmlFor="fixture-match-round"
					hint={`Agrupa el partido en la ${roundLabel.toLowerCase()}.`}
				>
					<Input
						id="fixture-match-round"
						type="number"
						min={1}
						value={roundNumber}
						onChange={(event) => setRoundNumber(event.target.value)}
					/>
				</Field>
				<Field
					label="Fecha y hora (local)"
					htmlFor="fixture-match-date"
					hint="Déjalo vacío para dejar el partido sin fecha."
				>
					<Input
						id="fixture-match-date"
						type="datetime-local"
						value={scheduledAt}
						onChange={(event) => setScheduledAt(event.target.value)}
					/>
				</Field>
				<Field label="Sede" htmlFor="fixture-match-venue">
					<Select
						id="fixture-match-venue"
						value={venueId}
						onChange={(event) => onVenueChange(event.target.value)}
					>
						<option value="">Sin sede</option>
						{venues.map((venue) => (
							<option key={venue.id} value={venue.id}>
								{venue.name}
							</option>
						))}
					</Select>
				</Field>
				<Field
					label="Cancha"
					htmlFor="fixture-match-field"
					hint={
						selectedVenue && selectedVenue.fieldCount === 0
							? "La sede no tiene canchas configuradas."
							: undefined
					}
				>
					<Select
						id="fixture-match-field"
						value={fieldNumber ? String(fieldNumber) : ""}
						onChange={(event) =>
							setFieldNumber(
								event.target.value ? Number(event.target.value) : null,
							)
						}
						disabled={!venueId}
					>
						<option value="">Sin cancha</option>
						{fieldsOf(selectedVenue).map((field) => (
							<option key={field} value={field}>
								Cancha {field}
							</option>
						))}
					</Select>
				</Field>
			</form>
		</EditDialog>
	);
}

function MoveMatchdayDialog({
	matchday,
	roundLabel,
	onClose,
}: {
	matchday: Matchday<FixtureItem>;
	roundLabel: string;
	onClose: () => void;
}) {
	const updateMatch = useUpdateMatch(api);
	const scheduled = matchday.items.filter((item) => item.scheduledAt);
	const firstDate = scheduled
		.map((item) => localDateKey(item.scheduledAt))
		.find((key): key is string => key !== null);
	const [date, setDate] = React.useState(firstDate ?? todayLocalDate());
	const [error, setError] = React.useState<string | null>(null);
	const [pending, setPending] = React.useState(false);

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setError(null);
		if (!date) {
			setError("Elige la nueva fecha.");
			return;
		}
		if (scheduled.length === 0) {
			setError("Esta jornada no tiene partidos con fecha.");
			return;
		}
		setPending(true);
		try {
			let moved = 0;
			for (const item of scheduled) {
				const time = localTimeKey(item.scheduledAt);
				if (!time) continue;
				const iso = new Date(`${date}T${time}`).toISOString();
				await updateMatch.mutateAsync({
					id: item.id,
					body: { scheduledAt: iso },
				});
				moved += 1;
			}
			toast.success(`${moved} partidos movidos a ${formatDateKey(date)}`);
			onClose();
		} catch (err) {
			setError(getApiErrorMessage(err));
		} finally {
			setPending(false);
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Reprogramar ${roundLabel.toLowerCase()} ${matchday.roundNumber}`}
			description={`Mueve los ${scheduled.length} partidos con fecha a otro día, conservando la hora local de cada uno.`}
			error={error}
			footer={
				<>
					<Button variant="secondary" type="button" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="fixture-move-form"
						icon={Save}
						disabled={pending || scheduled.length === 0}
					>
						{pending ? "Moviendo…" : "Mover"}
					</Button>
				</>
			}
		>
			<form id="fixture-move-form" onSubmit={onSubmit} className="space-y-4">
				<Field label="Nueva fecha" htmlFor="fixture-move-date">
					<Input
						id="fixture-move-date"
						type="date"
						value={date}
						onChange={(event) => setDate(event.target.value)}
						required
					/>
				</Field>
				{matchday.items.length > scheduled.length && (
					<p className="text-sm text-(--sea-ink-soft)">
						{matchday.items.length - scheduled.length} partido(s) sin fecha no
						se mueven.
					</p>
				)}
			</form>
		</EditDialog>
	);
}

function AddMatchDialog({
	stageId,
	tournamentId,
	groups,
	registrations,
	roundLabel,
	onClose,
}: {
	stageId: string;
	tournamentId: string;
	groups: GroupOption[];
	registrations: RegistrationOption[];
	roundLabel: string;
	onClose: () => void;
}) {
	const createMatch = useCreateMatch(api);
	const [groupId, setGroupId] = React.useState(groups[0]?.id ?? "");
	const [roundNumber, setRoundNumber] = React.useState("1");
	const [homeTeamId, setHomeTeamId] = React.useState("");
	const [awayTeamId, setAwayTeamId] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const availableTeams = React.useMemo(
		() =>
			(groupId
				? registrations.filter((item) => item.registration.groupId === groupId)
				: registrations
			).map((item) => item.team),
		[groupId, registrations],
	);

	React.useEffect(() => {
		setHomeTeamId((current) =>
			availableTeams.some((team) => team.id === current)
				? current
				: (availableTeams[0]?.id ?? ""),
		);
		setAwayTeamId((current) =>
			availableTeams.some((team) => team.id === current) &&
			current !== availableTeams[0]?.id
				? current
				: (availableTeams[1]?.id ?? ""),
		);
	}, [availableTeams]);

	const onSubmit = async (event: React.SyntheticEvent) => {
		event.preventDefault();
		setError(null);
		const round = Number(roundNumber);
		if (!Number.isInteger(round) || round < 1) {
			setError(`${roundLabel} debe ser un número entero mayor o igual a 1.`);
			return;
		}
		if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
			setError("Elige dos equipos distintos.");
			return;
		}
		const body: CreateMatch = {
			stageId,
			tournamentId,
			groupId: groupId || null,
			roundNumber: round,
			homeTeamId,
			awayTeamId,
		};
		try {
			await createMatch.mutateAsync(body);
			toast.success("Partido agregado");
			onClose();
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title="Agregar partido"
			description="Crea un partido entre dos equipos inscritos. Después ajusta su fecha, sede y cancha desde la tabla."
			error={error}
			footer={
				<>
					<Button variant="secondary" type="button" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						type="submit"
						form="fixture-add-form"
						icon={Save}
						disabled={
							createMatch.isPending ||
							availableTeams.length < 2 ||
							homeTeamId === awayTeamId
						}
					>
						{createMatch.isPending ? "Agregando…" : "Agregar"}
					</Button>
				</>
			}
		>
			<form id="fixture-add-form" onSubmit={onSubmit} className="space-y-4">
				<Field
					label={roundLabel}
					htmlFor="fixture-add-round"
					hint={`Agrupa el partido en la ${roundLabel.toLowerCase()}.`}
				>
					<Input
						id="fixture-add-round"
						type="number"
						min={1}
						value={roundNumber}
						onChange={(event) => setRoundNumber(event.target.value)}
					/>
				</Field>
				{groups.length > 0 && (
					<Field label="Grupo" htmlFor="fixture-add-group">
						<Select
							id="fixture-add-group"
							value={groupId}
							onChange={(event) => setGroupId(event.target.value)}
						>
							<option value="">Sin grupo</option>
							{groups.map((group) => (
								<option key={group.id} value={group.id}>
									{group.name}
								</option>
							))}
						</Select>
					</Field>
				)}
				<Field label="Local" htmlFor="fixture-add-home">
					<Select
						id="fixture-add-home"
						value={homeTeamId}
						onChange={(event) => setHomeTeamId(event.target.value)}
					>
						{availableTeams.map((team) => (
							<option key={team.id} value={team.id}>
								{team.name}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Visitante" htmlFor="fixture-add-away">
					<Select
						id="fixture-add-away"
						value={awayTeamId}
						onChange={(event) => setAwayTeamId(event.target.value)}
					>
						{availableTeams.map((team) => (
							<option key={team.id} value={team.id}>
								{team.name}
							</option>
						))}
					</Select>
				</Field>
				{availableTeams.length < 2 && (
					<p className="text-sm text-(--sea-ink-soft)">
						El grupo elegido necesita al menos 2 equipos.
					</p>
				)}
			</form>
		</EditDialog>
	);
}

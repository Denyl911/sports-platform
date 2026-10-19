import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import {
	useCreateSportEventType,
	useDeleteSportEventType,
	useSportEventTypes,
	useUpdateSport,
	useUpdateSportEventType,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	Dumbbell,
	EditDialog,
	EmptyState,
	Field,
	Input,
	Label,
	Pencil,
	Plus,
	Save,
	Select,
	Skeleton,
	Trash2,
	toast,
	useConfirm,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { resolveSportIcon } from "../../../lib/sport-icon";
import * as React from "react";
import { AdminBreadcrumbs } from "../../../components/AdminBreadcrumbs";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/sports/$sportId")({
	component: AdminSportDetailPage,
});

function AdminSportDetailPage() {
	const { sportId } = Route.useParams();
	const { data: sportData } = useQuery({
		queryKey: queryKeys.sports.detail(sportId),
		queryFn: () => unwrap(api.sports({ id: sportId }).get()),
	});
	const { data: eventTypesData } = useSportEventTypes(api, sportId);
	const createEvent = useCreateSportEventType(api);
	const deleteEvent = useDeleteSportEventType(api);
	const updateSport = useUpdateSport(api);
	const confirm = useConfirm();

	const sport = sportData as
		| {
				id: string;
				name: string;
				hasDraws?: boolean | null;
				periodName?: string | null;
				regularPeriods?: number | null;
				icon?: string | null;
				scoringRules?: Record<string, number> | null;
		  }
		| undefined;
	const eventTypes =
		(
			eventTypesData as
				| {
						items: Array<{
							id: string;
							code: string;
							name: string;
							affectsScore: boolean;
							defaultValue?: number | null;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];

	const [code, setCode] = React.useState("");
	const [name, setName] = React.useState("");
	const [affectsScore, setAffectsScore] = React.useState(false);
	const [defaultValue, setDefaultValue] = React.useState("1");
	const [editingEvent, setEditingEvent] = React.useState<
		(typeof eventTypes)[number] | null
	>(null);

	// Reglamento del deporte: lo que el seed escribe y hasta ahora era invisible.
	const [sportName, setSportName] = React.useState("");
	const [hasDraws, setHasDraws] = React.useState(true);
	const [periodName, setPeriodName] = React.useState("periodo");
	const [regularPeriods, setRegularPeriods] = React.useState("2");
	const [winPts, setWinPts] = React.useState("3");
	const [drawPts, setDrawPts] = React.useState("1");
	const [lossPts, setLossPts] = React.useState("0");

	React.useEffect(() => {
		if (!sport) return;
		const rules = sport.scoringRules ?? {};
		setSportName(sport.name);
		setHasDraws(sport.hasDraws ?? true);
		setPeriodName(sport.periodName ?? "periodo");
		setRegularPeriods(String(sport.regularPeriods ?? 2));
		// Los mismos valores por defecto que aplica la tabla de posiciones.
		setWinPts(String(rules.win ?? 3));
		setDrawPts(String(rules.draw ?? 1));
		setLossPts(String(rules.loss ?? 0));
	}, [sport]);

	if (!sport)
		return (
			<div className="space-y-3">
				<Skeleton className="h-10 w-64 rounded-xl" />
				<Skeleton className="h-40 rounded-xl" />
				<Skeleton className="h-40 rounded-xl" />
			</div>
		);

	const onSaveConfig = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		if (!sportName.trim()) {
			toast.error("El nombre es obligatorio");
			return;
		}
		if (Number(regularPeriods) < 1) {
			toast.error("Un deporte tiene al menos un periodo");
			return;
		}
		try {
			await updateSport.mutateAsync({
				id: sportId,
				body: {
					name: sportName.trim(),
					hasDraws,
					periodName: periodName.trim() || "periodo",
					regularPeriods: Number(regularPeriods),
					scoringRules: {
						win: Number(winPts),
						draw: Number(drawPts),
						loss: Number(lossPts),
					},
				},
			});
			toast.success("Reglamento guardado");
		} catch (err) {
			toast.error("No se pudo guardar el reglamento", getApiErrorMessage(err));
		}
	};

	const onCreateEvent = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await createEvent.mutateAsync({
				sportId,
				body: {
					code,
					name,
					affectsScore,
					defaultValue: affectsScore ? Number(defaultValue) : 0,
					sportId,
				},
			});
			setCode("");
			setName("");
			setDefaultValue("1");
			toast.success("Tipo de evento creado");
		} catch (err) {
			toast.error(
				"No se pudo crear el tipo de evento",
				getApiErrorMessage(err),
			);
		}
	};

	return (
		<div className="space-y-6">
			<AdminBreadcrumbs
				pieces={[
					{ label: "Admin", to: "/admin" },
					{ label: "Deportes", to: "/admin/sports" },
					{ label: sport.name },
				]}
			/>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<div className="flex items-center gap-2">
						{(() => {
							const Icon = resolveSportIcon(sport.name, sport.icon);
							return <Icon className="h-5 w-5 text-(--sea-ink)" />;
						})()}
						<CardTitle>{sport.name}</CardTitle>
					</div>
				</CardHeader>
				<div className="mb-4 flex flex-wrap gap-2">
					<Badge variant="outline">{sport.id}</Badge>
					<Badge variant={sport.hasDraws ? "success" : "secondary"}>
						{sport.hasDraws ? "con empates" : "sin empates"}
					</Badge>
					<Badge variant="outline">
						{sport.regularPeriods ?? 2} · {sport.periodName ?? "periodo"}
					</Badge>
					<Badge variant="outline">
						{winPts} / {drawPts} / {lossPts} puntos
					</Badge>
				</div>
				<form
					onSubmit={onSaveConfig}
					className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
				>
					<Field label="Nombre" htmlFor="sport-name" className="sm:col-span-2">
						<Input
							id="sport-name"
							value={sportName}
							onChange={(e) => setSportName(e.target.value)}
							required
							maxLength={50}
						/>
					</Field>
					<Field label="Empates" htmlFor="sport-draws">
						<Select
							id="sport-draws"
							value={String(hasDraws)}
							onChange={(e) => setHasDraws(e.target.value === "true")}
						>
							<option value="true">Se permiten</option>
							<option value="false">No se permiten</option>
						</Select>
					</Field>
					<Field label="Cómo se llama el periodo" htmlFor="sport-period-name">
						<Input
							id="sport-period-name"
							value={periodName}
							onChange={(e) => setPeriodName(e.target.value)}
							placeholder="tiempo, set, entrada"
							maxLength={20}
						/>
					</Field>
					<Field label="Periodos regulares" htmlFor="sport-periods">
						<Input
							id="sport-periods"
							type="number"
							min={1}
							value={regularPeriods}
							onChange={(e) => setRegularPeriods(e.target.value)}
							required
						/>
					</Field>
					<Field label="Puntos por victoria" htmlFor="sport-win">
						<Input
							id="sport-win"
							type="number"
							min={0}
							value={winPts}
							onChange={(e) => setWinPts(e.target.value)}
							required
						/>
					</Field>
					<Field label="Puntos por empate" htmlFor="sport-draw">
						<Input
							id="sport-draw"
							type="number"
							min={0}
							value={drawPts}
							onChange={(e) => setDrawPts(e.target.value)}
							required
						/>
					</Field>
					<Field label="Puntos por derrota" htmlFor="sport-loss">
						<Input
							id="sport-loss"
							type="number"
							min={0}
							value={lossPts}
							onChange={(e) => setLossPts(e.target.value)}
							required
						/>
					</Field>
					<div className="flex items-end">
						<Button type="submit" icon={Save} disabled={updateSport.isPending}>
							{updateSport.isPending ? "Guardando…" : "Guardar reglamento"}
						</Button>
					</div>
				</form>
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Tipos de evento</h3>
				<form onSubmit={onCreateEvent} className="mt-3 flex flex-wrap gap-2">
					<Input
						value={code}
						onChange={(e) => setCode(e.target.value)}
						placeholder="goal"
						required
						className="w-32"
					/>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Gol"
						required
						className="flex-1 min-w-32"
					/>
					<Select
						value={String(affectsScore)}
						onChange={(e) => setAffectsScore(e.target.value === "true")}
						className="w-32"
					>
						<option value="true">afecta score</option>
						<option value="false">no afecta</option>
					</Select>
					<Input
						type="number"
						min={0}
						value={defaultValue}
						onChange={(e) => setDefaultValue(e.target.value)}
						disabled={!affectsScore}
						title="Cuánto suma al marcador (solo si afecta)"
						placeholder="Valor"
						className="w-24"
					/>
					<Button type="submit" icon={Plus} disabled={createEvent.isPending}>
						Crear
					</Button>
				</form>
				<div className="mt-3 flex flex-wrap gap-2">
					{eventTypes.map((et) => (
						<div
							key={et.id}
							className="flex items-center gap-1 rounded-full border border-(--line) bg-(--chip-bg) px-2 py-1 text-xs"
						>
							<Badge variant={et.affectsScore ? "success" : "outline"}>
								{et.code}
							</Badge>
							<span>{et.name}</span>
							{et.affectsScore && (
								<span className="text-(--sea-ink-soft)">
									+{et.defaultValue ?? 1}
								</span>
							)}
							<Button
								variant="ghost"
								size="icon-sm"
								icon={Pencil}
								aria-label="Editar"
								title="Editar"
								className="h-6 w-6"
								onClick={() => setEditingEvent(et)}
							/>
							<Button
								variant="destructive"
								size="icon-sm"
								icon={Trash2}
								aria-label="Eliminar"
								title="Eliminar"
								className="h-6 w-6"
								onClick={async () => {
									const ok = await confirm({
										title: "Eliminar tipo de evento",
										description: `Se elimina «${et.code}». No se puede deshacer.`,
										confirmLabel: "Eliminar",
									});
									if (!ok) return;
									try {
										await deleteEvent.mutateAsync(et.id);
										toast.success("Tipo de evento eliminado");
									} catch (err) {
										toast.error(
											"No se pudo eliminar el tipo de evento",
											getApiErrorMessage(err),
										);
									}
								}}
							/>
						</div>
					))}
				</div>
				{eventTypes.length === 0 && (
					<EmptyState
						icon={Dumbbell}
						title="Sin tipos de evento"
						description="Define los códigos (gol, tarjeta…) con los que se registrarán las incidencias."
						className="mt-3"
					/>
				)}
			</Card>
			{editingEvent && (
				<EventTypeEditDialog
					eventType={editingEvent}
					onClose={() => setEditingEvent(null)}
				/>
			)}
		</div>
	);
}

function EventTypeEditDialog({
	eventType,
	onClose,
}: {
	eventType: {
		id: string;
		code: string;
		name: string;
		affectsScore: boolean;
		defaultValue?: number | null;
	};
	onClose: () => void;
}) {
	const updateEvent = useUpdateSportEventType(api);
	const [code, setCode] = React.useState(eventType.code);
	const [name, setName] = React.useState(eventType.name);
	const [affectsScore, setAffectsScore] = React.useState(
		eventType.affectsScore,
	);
	const [defaultValue, setDefaultValue] = React.useState(
		eventType.defaultValue != null ? String(eventType.defaultValue) : "1",
	);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await updateEvent.mutateAsync({
				eventTypeId: eventType.id,
				body: {
					code,
					name,
					affectsScore,
					defaultValue: Number(defaultValue),
				},
			});
			toast.success("Tipo de evento actualizado");
			onClose();
		} catch (err) {
			toast.error(
				"No se pudo actualizar el tipo de evento",
				getApiErrorMessage(err),
			);
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Editar ${eventType.code}`}
			description="El código debe ser único dentro del deporte."
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						size="sm"
						icon={Save}
						onClick={onSubmit}
						disabled={updateEvent.isPending}
					>
						Guardar
					</Button>
				</>
			}
		>
			<form onSubmit={onSubmit} className="space-y-3">
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<Label>Código</Label>
						<Input
							value={code}
							onChange={(e) => setCode(e.target.value)}
							required
							maxLength={40}
						/>
					</div>
					<div>
						<Label>Nombre</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							maxLength={60}
						/>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<Label>Afecta marcador</Label>
						<Select
							value={String(affectsScore)}
							onChange={(e) => setAffectsScore(e.target.value === "true")}
						>
							<option value="true">afecta score</option>
							<option value="false">no afecta</option>
						</Select>
					</div>
					<div>
						<Label>Valor por defecto</Label>
						<Input
							type="number"
							value={defaultValue}
							onChange={(e) => setDefaultValue(e.target.value)}
							required
						/>
					</div>
				</div>
			</form>
		</EditDialog>
	);
}

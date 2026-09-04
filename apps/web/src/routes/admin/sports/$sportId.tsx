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
	EditDialog,
	Input,
	Label,
	Select,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
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

	const sport = sportData as
		| { id: string; name: string; hasDraws?: boolean | null }
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
	const [error, setError] = React.useState<string | null>(null);
	const [editingEvent, setEditingEvent] = React.useState<
		(typeof eventTypes)[number] | null
	>(null);

	if (!sport)
		return <div className="demo-center text-sm">Cargando deporte…</div>;

	const onCreateEvent = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await createEvent.mutateAsync({
				sportId,
				body: { code, name, affectsScore, sportId },
			});
			setCode("");
			setName("");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/sports" className="text-sm text-(--sea-ink-soft)">
				← Deportes
			</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>{sport.name}</CardTitle>
				</CardHeader>
				<div className="flex gap-2">
					<Badge variant="outline">{sport.id}</Badge>
					<Badge variant={sport.hasDraws ? "success" : "secondary"}>
						{sport.hasDraws ? "con empates" : "sin empates"}
					</Badge>
					<Button
						variant="ghost"
						size="sm"
						onClick={async () => {
							try {
								await updateSport.mutateAsync({
									id: sportId,
									body: { hasDraws: !sport.hasDraws },
								});
							} catch (err) {
								setError(getApiErrorMessage(err));
							}
						}}
					>
						Toggle empates
					</Button>
				</div>
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
					<Button type="submit" disabled={createEvent.isPending}>
						Crear
					</Button>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
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
							{et.defaultValue != null && et.defaultValue !== 1 && (
								<span className="text-(--sea-ink-soft)">
									+{et.defaultValue}
								</span>
							)}
							<Button
								variant="ghost"
								size="sm"
								className="h-5 px-1 text-xs"
								onClick={() => setEditingEvent(et)}
							>
								Editar
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-5 px-1 text-xs"
								onClick={async () => {
									if (!confirm(`¿Eliminar ${et.code}?`)) return;
									try {
										await deleteEvent.mutateAsync(et.id);
									} catch (err) {
										setError(getApiErrorMessage(err));
									}
								}}
							>
								×
							</Button>
						</div>
					))}
				</div>
				{eventTypes.length === 0 && (
					<div className="text-sm text-(--sea-ink-soft) mt-2">
						Sin tipos de evento
					</div>
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
	const [error, setError] = React.useState<string | null>(null);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
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
			onClose();
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Editar ${eventType.code}`}
			description="El código debe ser único dentro del deporte."
			error={error}
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button size="sm" onClick={onSubmit} disabled={updateEvent.isPending}>
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

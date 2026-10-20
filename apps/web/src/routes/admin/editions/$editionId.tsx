import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreateStage,
	useDeleteStage,
	useReorderStages,
	useStagesByEdition,
	useUpdateStage,
} from "@sports/api-client/hooks";
import {
	Button,
	Card,
	EditDialog,
	Field,
	Input,
	Label,
	Plus,
	Save,
	Select,
	Skeleton,
	toast,
} from "@sports/ui";
import { createFileRoute } from "@tanstack/react-router";
import { SortableStageList, StageTypeLabels } from "../../../components/SortableStageList";
import * as React from "react";
import {
	AdminBreadcrumbs,
	useEditionName,
	useTournamentName,
} from "../../../components/AdminBreadcrumbs";
import { AdminFlowSteps } from "../../../components/AdminFlowSteps";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/editions/$editionId")({
	component: AdminEditionDetailPage,
});

type StageType =
	| "round_robin"
	| "single_elimination"
	| "double_elimination"
	| "swiss"
	| "manual";

/** El enum de la API, con la palabra del dominio para elegirlo. */
const STAGE_TYPES: Array<[StageType, string]> = [
	["round_robin", "Liguilla (todos contra todos)"],
	["single_elimination", "Eliminación directa"],
	["double_elimination", "Doble eliminación"],
	["swiss", "Suizo"],
	["manual", "Manual"],
];

const STAGE_TYPE_DESCRIPTIONS: Record<StageType, string> = {
	round_robin:
		"Cada equipo juega contra todos los demás una o más veces. Clasificación por puntos.",
	single_elimination:
		"Un solo partido elimina al perdedor. El ganador avanza a la siguiente ronda.",
	double_elimination:
		"Un equipo necesita perder dos veces para ser eliminado. Más justo pero más largo.",
	swiss:
		"Los emparejanientos se hacen según resultados previos. Todos juegan todas las rondas.",
	manual: "El orden de los partidos lo define el organizador. Sin estructura automática.",
};

function AdminEditionDetailPage() {
	const { editionId } = Route.useParams();
	const search = Route.useSearch() as { tournamentId?: string };
	const tournamentId = search.tournamentId ?? null;
	const { data: stagesData, isPending: stagesPending } = useStagesByEdition(
		api,
		editionId,
	);
	const createStage = useCreateStage(api);
	const deleteStage = useDeleteStage(api);
	const reorderStages = useReorderStages(api, editionId);
	const stages =
		(
			stagesData as
				| {
						items: Array<{
							id: string;
							name: string;
							stageType: string;
							sequenceOrder: number;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];

	const [name, setName] = React.useState("");
	const [stageType, setStageType] = React.useState<StageType>("round_robin");
	const [seq, setSeq] = React.useState(1);
	const [editingStage, setEditingStage] = React.useState<
		(typeof stages)[number] | null
	>(null);
	const tournamentName = useTournamentName(tournamentId);
	const editionName = useEditionName(tournamentId, editionId);

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await createStage.mutateAsync({
				editionId,
				body: { name, stageType, sequenceOrder: seq },
			});
			setName("");
			toast.success("Etapa creada");
		} catch (err) {
			toast.error("No se pudo crear la etapa", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<AdminBreadcrumbs
				pieces={[
					{ label: "Torneos", to: "/admin/tournaments" },
					...(tournamentId
						? [
								{
									label: tournamentName,
									to: `/admin/tournaments/${tournamentId}`,
								},
							]
						: []),
					{ label: editionName },
				]}
			/>
			<AdminFlowSteps current="stage" />
			<Card className="p-4">
				<h3 className="font-bold">Etapas de la edición {editionName}</h3>
				<p className="mt-1 max-w-2xl text-sm text-(--sea-ink-soft)">
					Una <strong>etapa</strong> agrupa los partidos de una forma de juego:
					liga, cuadro o fase de grupos. Crea la primera aquí y, dentro, sus
					grupos y equipos.
				</p>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-3">
					<Field
						label="Nombre"
						htmlFor="stage-name"
						className="min-w-48 flex-1"
					>
						<Input
							id="stage-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Fase 1"
							required
						/>
					</Field>
					<Field label="Tipo" htmlFor="stage-type" className="w-64">
						<Select
							id="stage-type"
							value={stageType}
							onChange={(e) => setStageType(e.target.value as StageType)}
						>
							{STAGE_TYPES.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Orden" htmlFor="stage-order" className="w-24">
						<Input
							id="stage-order"
							type="number"
							min={1}
							value={seq}
							onChange={(e) => setSeq(Number(e.target.value))}
							required
						/>
					</Field>
					<Button
						type="submit"
						icon={Plus}
						className="self-end"
						disabled={createStage.isPending}
					>
						{createStage.isPending ? "Creando…" : "Crear etapa"}
					</Button>
				</form>
				<div className="mt-4 rounded-xl border border-(--chip-line) bg-(--chip-bg) p-3">
					<h4 className="text-sm font-bold text-(--sea-ink)">Tipos de fase</h4>
					<div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{(Object.entries(StageTypeLabels) as Array<[keyof typeof StageTypeLabels, string]>).map(
							([key, label]) => (
								<div key={key} className="rounded-lg bg-(--card) p-2.5">
									<span className="text-xs font-bold text-(--sea-ink)">{label}</span>
									<p className="mt-0.5 text-xs text-(--sea-ink-soft)">
										{STAGE_TYPE_DESCRIPTIONS[key]}
									</p>
								</div>
							),
						)}
					</div>
				</div>
				{stagesPending ? (
					<div className="mt-4">
						<Skeleton className="h-24 rounded-xl" />
						<Skeleton className="h-24 rounded-xl" />
					</div>
				) : (
					<SortableStageList
						stages={stages.map((s) => ({
							id: s.id,
							name: s.name,
							stageType: s.stageType as StageType,
							sequenceOrder: s.sequenceOrder,
						}))}
						onReorder={(ids: string[]) => reorderStages.mutateAsync({ stageIds: ids }).then(() => undefined)}
						onEdit={setEditingStage}
						onDelete={(id: string) => deleteStage.mutateAsync(id).then(() => undefined)}
						editionId={editionId}
						tournamentId={tournamentId ?? undefined}
					/>
				)}
			</Card>
			{editingStage && (
				<StageEditDialog
					stage={editingStage}
					onClose={() => setEditingStage(null)}
				/>
			)}
		</div>
	);
}

function StageEditDialog({
	stage,
	onClose,
}: {
	stage: {
		id: string;
		name: string;
		stageType: string;
		sequenceOrder: number;
	};
	onClose: () => void;
}) {
	const updateStage = useUpdateStage(api);
	const [name, setName] = React.useState(stage.name);
	const [stageType, setStageType] = React.useState<StageType>(
		stage.stageType as StageType,
	);
	const [seq, setSeq] = React.useState(stage.sequenceOrder);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await updateStage.mutateAsync({
				stageId: stage.id,
				body: { name, stageType, sequenceOrder: seq },
			});
			toast.success("Etapa guardada");
			onClose();
		} catch (err) {
			toast.error("No se pudo guardar la etapa", getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Editar etapa ${stage.name}`}
			description="El backend valida que el orden no se duplique dentro de la edición."
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						size="sm"
						icon={Save}
						onClick={onSubmit}
						disabled={updateStage.isPending}
					>
						Guardar
					</Button>
				</>
			}
		>
			<form onSubmit={onSubmit} className="space-y-3">
				<div>
					<Label>Nombre</Label>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<Label>Tipo</Label>
						<Select
							value={stageType}
							onChange={(e) => setStageType(e.target.value as StageType)}
						>
							{STAGE_TYPES.map(([value, label]) => (
								<option key={value} value={value}>
									{label}
								</option>
							))}
						</Select>
					</div>
					<div>
						<Label>Orden</Label>
						<Input
							type="number"
							min={1}
							value={seq}
							onChange={(e) => setSeq(Number(e.target.value))}
							required
						/>
					</div>
				</div>
			</form>
		</EditDialog>
	);
}

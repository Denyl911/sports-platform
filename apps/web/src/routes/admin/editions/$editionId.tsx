import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreateStage,
	useDeleteStage,
	useStagesByEdition,
	useUpdateStage,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	EditDialog,
	EmptyState,
	Field,
	Input,
	Label,
	Select,
	Skeleton,
	toast,
	useConfirm,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
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
	const confirm = useConfirm();
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
						className="self-end"
						disabled={createStage.isPending}
					>
						{createStage.isPending ? "Creando…" : "Crear etapa"}
					</Button>
				</form>
				{stagesPending ? (
					<div className="mt-4 grid gap-2 sm:grid-cols-2">
						<Skeleton className="h-24 rounded-xl" />
						<Skeleton className="h-24 rounded-xl" />
					</div>
				) : stages.length === 0 ? (
					<EmptyState
						className="mt-4"
						title="Sin etapas todavía"
						description="Crea la primera con el formulario de arriba: es el paso 3, y habilita los grupos y los partidos."
					/>
				) : (
					<div className="mt-4 grid gap-2 sm:grid-cols-2">
						{stages.map((s) => (
							<Card
								key={s.id}
								className="group flex flex-col justify-between p-3"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<CardHeader className="p-0">
											<CardTitle className="truncate text-sm">
												{s.name}
											</CardTitle>
										</CardHeader>
										<div className="mt-2 flex flex-wrap gap-1.5">
											<Badge>{s.stageType}</Badge>
											<Badge variant="secondary">#{s.sequenceOrder}</Badge>
										</div>
									</div>
									<div className="flex shrink-0 gap-1">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setEditingStage(s)}
										>
											Editar
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={async () => {
												const ok = await confirm({
													title: "Eliminar etapa",
													description: `Se elimina «${s.name}» y sus grupos. No se puede deshacer.`,
													confirmLabel: "Eliminar",
												});
												if (!ok) return;
												try {
													await deleteStage.mutateAsync(s.id);
													toast.success("Etapa eliminada");
												} catch (err) {
													toast.error(
														"No se pudo eliminar la etapa",
														getApiErrorMessage(err),
													);
												}
											}}
										>
											Eliminar
										</Button>
									</div>
								</div>
								<Link
									to="/admin/stages/$stageId"
									params={{ stageId: s.id }}
									search={{
										editionId,
										tournamentId: tournamentId ?? undefined,
									}}
									className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-(--sea-ink) no-underline"
								>
									Grupos y equipos
									<span
										aria-hidden="true"
										className="transition-transform group-hover:translate-x-0.5"
									>
										→
									</span>
								</Link>
							</Card>
						))}
					</div>
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
					<Button size="sm" onClick={onSubmit} disabled={updateStage.isPending}>
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

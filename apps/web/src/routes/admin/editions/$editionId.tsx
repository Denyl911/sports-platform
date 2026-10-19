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
			<Card className="p-4">
				<h3 className="font-bold">Etapas de la edición {editionName}</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Fase 1"
						required
						className="flex-1 min-w-32"
					/>
					<Select
						value={stageType}
						onChange={(e) => setStageType(e.target.value as StageType)}
					>
						<option value="round_robin">round_robin</option>
						<option value="single_elimination">single_elimination</option>
						<option value="swiss">swiss</option>
					</Select>
					<Input
						type="number"
						value={seq}
						onChange={(e) => setSeq(Number(e.target.value))}
						className="w-20"
					/>
					<Button type="submit" disabled={createStage.isPending}>
						Crear etapa
					</Button>
				</form>
				<div className="mt-4 grid gap-2 sm:grid-cols-2">
					{stagesPending ? (
						<>
							<Skeleton className="h-24 rounded-xl" />
							<Skeleton className="h-24 rounded-xl" />
						</>
					) : (
						stages.map((s) => (
							<Card key={s.id} className="p-3 flex flex-col">
								<Link
									to="/admin/stages/$stageId"
									params={{ stageId: s.id }}
									search={{
										editionId,
										tournamentId: tournamentId ?? undefined,
									}}
									className="no-underline"
								>
									<CardHeader className="p-0">
										<CardTitle className="text-sm">{s.name}</CardTitle>
									</CardHeader>
									<div className="flex gap-2 mt-1">
										<Badge>{s.stageType}</Badge>
										<Badge variant="secondary">#{s.sequenceOrder}</Badge>
									</div>
								</Link>
								<div className="mt-2 flex gap-2 self-start">
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
							</Card>
						))
					)}
				</div>
				{stages.length === 0 && (
					<EmptyState
						title="Sin etapas"
						description="Crea la primera etapa de la edición con el formulario de arriba."
						className="mt-4"
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
							<option value="round_robin">round_robin</option>
							<option value="single_elimination">single_elimination</option>
							<option value="double_elimination">double_elimination</option>
							<option value="swiss">swiss</option>
							<option value="manual">manual</option>
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

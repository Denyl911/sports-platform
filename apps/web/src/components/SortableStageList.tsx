import { getApiErrorMessage } from "@sports/api-client";
import {
	ArrowRight,
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	Layers,
	Pencil,
	Trash2,
	toast,
	useConfirm,
} from "@sports/ui";
import {
	DndContext,
	closestCenter,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Link } from "@tanstack/react-router";
import { GripVertical } from "lucide-react";
import * as React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StageType =
	| "round_robin"
	| "single_elimination"
	| "double_elimination"
	| "swiss"
	| "manual";

export const StageTypeLabels: Record<StageType, string> = {
	round_robin: "Liguilla",
	single_elimination: "Eliminación directa",
	double_elimination: "Doble eliminación",
	swiss: "Suizo",
	manual: "Manual",
};

export interface SortableStage {
	id: string;
	name: string;
	stageType: StageType;
	sequenceOrder: number;
}

interface SortableStageListProps {
	stages: SortableStage[];
	onReorder: (stageIds: string[]) => Promise<void>;
	onEdit: (stage: SortableStage) => void;
	onDelete: (stageId: string) => Promise<void>;
	editionId: string;
	tournamentId: string | undefined;
}

// ---------------------------------------------------------------------------
// Sortable card (inner)
// ---------------------------------------------------------------------------

function SortableStageCard({
	stage,
	editionId,
	tournamentId,
	onEdit,
	onDelete,
}: {
	stage: SortableStage;
	editionId: string;
	tournamentId: string | undefined;
	onEdit: (stage: SortableStage) => void;
	onDelete: (stageId: string) => Promise<void>;
}) {
	const confirm = useConfirm();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: stage.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={`group flex flex-col justify-between p-3 ${
				isDragging ? "z-10 opacity-90 shadow-lg" : ""
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<CardHeader className="p-0">
						<CardTitle className="truncate text-sm">
							{stage.name}
						</CardTitle>
					</CardHeader>
					<div className="mt-2 flex flex-wrap gap-1.5">
						<Badge>{StageTypeLabels[stage.stageType]}</Badge>
						<Badge variant="secondary">#{stage.sequenceOrder}</Badge>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						icon={GripVertical}
						aria-label="Arrastrar"
						title="Arrastrar para reordenar"
						{...attributes}
						{...listeners}
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						icon={Pencil}
						aria-label="Editar"
						title="Editar"
						onClick={() => onEdit(stage)}
					/>
					<Button
						variant="destructive"
						size="icon-sm"
						icon={Trash2}
						aria-label="Eliminar"
						title="Eliminar"
						onClick={async () => {
							const ok = await confirm({
								title: "Eliminar etapa",
								description: `Se elimina «${stage.name}» y sus grupos. No se puede deshacer.`,
								confirmLabel: "Eliminar",
							});
							if (!ok) return;
							try {
								await onDelete(stage.id);
								toast.success("Etapa eliminada");
							} catch (err) {
								toast.error(
									"No se pudo eliminar la etapa",
									getApiErrorMessage(err),
								);
							}
						}}
					/>
				</div>
			</div>
			<Link
				to="/admin/stages/$stageId"
				params={{ stageId: stage.id }}
				search={{
					editionId,
					tournamentId: tournamentId ?? undefined,
				}}
				className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-(--sea-ink) no-underline"
			>
				Grupos y equipos
				<ArrowRight
					{...DECORATIVE}
					className="size-4 transition-transform group-hover:translate-x-0.5"
				/>
			</Link>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SortableStageList({
	stages,
	onReorder,
	onEdit,
	onDelete,
	editionId,
	tournamentId,
}: SortableStageListProps) {
	const [items, setItems] = React.useState(stages);

	// Keep local items in sync when the parent's stages array changes
	React.useEffect(() => {
		setItems(stages);
	}, [stages]);

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = items.findIndex((s) => s.id === active.id);
		const newIndex = items.findIndex((s) => s.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const newItems = arrayMove(items, oldIndex, newIndex);
		setItems(newItems);

		const newIds = newItems.map((s) => s.id);
		await onReorder(newIds);
	};

	// -------------------------------------------------------------------------
	// Empty / loading states
	// -------------------------------------------------------------------------

	if (items.length === 0) {
		return (
			<div className="mt-4">
				<Card className="p-4">
					<div className="flex items-center gap-3 text-(--sea-ink-soft)">
						<Layers {...DECORATIVE} className="size-5" />
						<div>
							<p className="text-sm font-medium">Sin etapas todavía</p>
							<p className="text-xs">
								Reordena las existentes arrastrando el icono ⋮⋮.
							</p>
						</div>
					</div>
				</Card>
			</div>
		);
	}

	return (
		<div className="mt-4">
			<DndContext
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={items.map((s) => s.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-2">
						{items.map((stage) => (
							<SortableStageCard
								key={stage.id}
								stage={stage}
								editionId={editionId}
								tournamentId={tournamentId}
								onEdit={onEdit}
								onDelete={onDelete}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}

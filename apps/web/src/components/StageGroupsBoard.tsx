import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	rectIntersection,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { getApiErrorMessage } from "@sports/api-client";
import { useUpdateRegistrationGroup } from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	cn,
	DECORATIVE,
	GripVertical,
	Pencil,
	Table,
	Table2,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	Trash2,
	toast,
} from "@sports/ui";
import * as React from "react";
import { createPortal } from "react-dom";
import { api } from "../lib/api";

export interface BoardGroup {
	id: string;
	name: string;
}

export interface BoardRegistration {
	registration: {
		id: string;
		teamId: string;
		groupId: string | null;
		position: number | null;
	};
	team: { id: string; name: string };
}

interface PendingMove {
	groupId: string | null;
	position: number | null;
}

interface DropTarget {
	kind: "row" | "group";
	groupId: string | null;
	index: number;
}

const POOL_ID = "sin-grupo";
const groupDroppableId = (groupId: string) => `grupo:${groupId}`;

interface StageGroupsBoardProps {
	groups: BoardGroup[];
	registrations: BoardRegistration[];
	onEditGroup: (group: BoardGroup) => void;
	onDeleteGroup: (group: BoardGroup) => void;
}

/**
 * Tablero de grupos: una tabla por grupo y una bandeja "Sin grupo". Los
 * equipos se arrastran entre tablas y dentro de una misma tabla para cambiar
 * su orden (o con el teclado: foco en el asa, espacio, flechas, espacio). Cada
 * suelta persiste con `PATCH /registrations/:id/group` —`position` es el
 * índice dentro del grupo— y el movimiento es optimista: se revierte si el
 * contrato lo rechaza.
 */
export function StageGroupsBoard({
	groups,
	registrations,
	onEditGroup,
	onDeleteGroup,
}: StageGroupsBoardProps) {
	const updateGroup = useUpdateRegistrationGroup(api);
	const [pending, setPending] = React.useState<Record<string, PendingMove>>({});
	const [activeId, setActiveId] = React.useState<string | null>(null);
	const [activeWidth, setActiveWidth] = React.useState<number | undefined>();

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	// Una vez que la API devuelve el mismo grupo y posición, el ajuste optimista
	// ya no hace falta: se suelta para no tapar cambios de otras sesiones.
	React.useEffect(() => {
		setPending((current) => {
			let changed = false;
			const next = { ...current };
			for (const item of registrations) {
				const move = next[item.registration.id];
				if (
					move &&
					move.groupId === item.registration.groupId &&
					move.position === item.registration.position
				) {
					delete next[item.registration.id];
					changed = true;
				}
			}
			return changed ? next : current;
		});
	}, [registrations]);

	const regById = new Map(
		registrations.map((item) => [item.registration.id, item]),
	);

	const groupOf = (item: BoardRegistration) =>
		item.registration.id in pending
			? pending[item.registration.id].groupId
			: item.registration.groupId;
	const positionOf = (item: BoardRegistration) =>
		item.registration.id in pending
			? pending[item.registration.id].position
			: item.registration.position;

	// La posición manual manda; lo que nunca se movió conserva el orden de la
	// API (semilla + nombre) porque el sort es estable.
	const compareByPosition = (a: BoardRegistration, b: BoardRegistration) => {
		const left = positionOf(a);
		const right = positionOf(b);
		if (left === right) return 0;
		if (left === null) return 1;
		if (right === null) return -1;
		return left - right;
	};

	const grouped = new Map<string, BoardRegistration[]>(
		groups.map((group) => [group.id, []]),
	);
	const pool: BoardRegistration[] = [];
	for (const item of registrations) {
		const groupId = groupOf(item);
		const bucket = groupId ? grouped.get(groupId) : undefined;
		if (bucket) {
			bucket.push(item);
		} else {
			pool.push(item);
		}
	}
	for (const rows of grouped.values()) rows.sort(compareByPosition);

	const onDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveId(null);
		if (!over) return;

		const registrationId = String(active.id);
		const item = regById.get(registrationId);
		if (!item) return;

		const drop = over.data.current as DropTarget | undefined;
		if (!drop || drop.index === undefined) return;

		const currentGroupId = groupOf(item);
		const sourceRows = currentGroupId
			? [...(grouped.get(currentGroupId) ?? [])]
			: null;

		// Soltar sobre una fila inserta antes o después según el centro del
		// overlay; soltar sobre la tarjeta agrega al final (o al inicio si el
		// grupo está vacío).
		let insertAt = drop.index;
		if (drop.kind === "row") {
			const translated = active.rect.current.translated;
			if (translated) {
				const activeCenter = translated.top + translated.height / 2;
				const overCenter = over.rect.top + over.rect.height / 2;
				if (activeCenter > overCenter) insertAt += 1;
			}
		}

		const previous = pending;

		if (currentGroupId === drop.groupId) {
			// Sin grupo no hay orden que guardar; dentro del grupo se reordena.
			if (!sourceRows) return;
			const from = sourceRows.findIndex(
				(row) => row.registration.id === registrationId,
			);
			if (from < 0) return;
			const to = Math.max(
				0,
				Math.min(
					insertAt > from ? insertAt - 1 : insertAt,
					sourceRows.length - 1,
				),
			);
			if (to === from) return;

			const reordered = arrayMove(sourceRows, from, to);
			setPending((current) => {
				const next = { ...current };
				for (const [index, row] of reordered.entries()) {
					next[row.registration.id] = {
						groupId: currentGroupId,
						position: index,
					};
				}
				return next;
			});

			try {
				await updateGroup.mutateAsync({
					id: registrationId,
					body: { groupId: currentGroupId, position: to },
				});
			} catch (err) {
				setPending(previous);
				toast.error("No se pudo reordenar el grupo", getApiErrorMessage(err));
			}
			return;
		}

		const targetGroupId = drop.groupId;
		const targetRows = targetGroupId
			? (grouped.get(targetGroupId) ?? []).filter(
					(row) => row.registration.id !== registrationId,
				)
			: null;
		const to = targetRows
			? Math.max(0, Math.min(insertAt, targetRows.length))
			: null;

		setPending((current) => {
			const next = { ...current };

			if (!targetGroupId) {
				next[registrationId] = { groupId: null, position: null };
			} else {
				const reordered = [...(targetRows ?? [])];
				reordered.splice(to ?? 0, 0, item);
				for (const [index, row] of reordered.entries()) {
					next[row.registration.id] = {
						groupId: targetGroupId,
						position: index,
					};
				}
			}

			// El grupo de origen se cierra sin el equipo: renumerar sus filas.
			if (sourceRows) {
				const remaining = sourceRows.filter(
					(row) => row.registration.id !== registrationId,
				);
				for (const [index, row] of remaining.entries()) {
					next[row.registration.id] = {
						groupId: currentGroupId,
						position: index,
					};
				}
			}
			return next;
		});

		try {
			await updateGroup.mutateAsync({
				id: registrationId,
				body:
					targetGroupId === null
						? { groupId: null }
						: { groupId: targetGroupId, position: to ?? 0 },
			});
			const target = targetGroupId
				? groups.find((group) => group.id === targetGroupId)
				: null;
			toast.success(
				target
					? `${item.team.name} pasa a ${target.name}`
					: `${item.team.name} queda sin grupo`,
			);
		} catch (err) {
			setPending(previous);
			toast.error("No se pudo mover el equipo", getApiErrorMessage(err));
		}
	};

	const onDragStart = (event: DragStartEvent) => {
		setActiveId(String(event.active.id));
		setActiveWidth(event.active.rect.current.initial?.width);
	};

	const active = activeId ? regById.get(activeId) : undefined;

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={rectIntersection}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			onDragCancel={() => setActiveId(null)}
		>
			<p className="text-xs text-(--sea-ink-soft)">
				Arrastra un equipo para cambiar de grupo o de posición dentro de su
				grupo. Con teclado: enfoca el asa, pulsa espacio, mueve con las flechas
				y vuelve a pulsar espacio.
			</p>
			<div className="mt-3 grid gap-3 lg:grid-cols-2">
				{groups.map((group) => (
					<GroupColumn
						key={group.id}
						group={group}
						rows={grouped.get(group.id) ?? []}
						onEdit={() => onEditGroup(group)}
						onDelete={() => onDeleteGroup(group)}
					/>
				))}
				<PoolColumn rows={pool} />
			</div>
			{/*
			 * El `DragOverlay` se monta en `document.body`: el `Card` que envuelve el
			 * tablero usa `backdrop-blur`, que crea un bloque contenedor para los
			 * descendientes `position: fixed`. Sin el portal, el overlay se posiciona
			 * respecto de la tarjeta y aparece desplazado del puntero.
			 */}
			{typeof document === "undefined"
				? null
				: createPortal(
						<DragOverlay dropAnimation={null}>
							{active ? (
								<div
									style={{ width: activeWidth }}
									className="flex items-center gap-2 rounded-lg border border-(--lagoon-deep) bg-(--surface-strong) px-3 py-2 text-sm font-semibold shadow-lg"
								>
									<GripVertical
										{...DECORATIVE}
										className="size-4 text-(--sea-ink-soft)"
									/>
									{active.team.name}
								</div>
							) : null}
						</DragOverlay>,
						document.body,
					)}
		</DndContext>
	);
}

function GroupColumn({
	group,
	rows,
	onEdit,
	onDelete,
}: {
	group: BoardGroup;
	rows: BoardRegistration[];
	onEdit: () => void;
	onDelete: () => void;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: groupDroppableId(group.id),
		data: { kind: "group", groupId: group.id, index: rows.length },
	});
	return (
		<Card
			ref={setNodeRef}
			className={cn(
				"p-3 transition-colors",
				isOver && "border-(--lagoon-deep) bg-(--chip-bg)",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-2">
					<Table2 {...DECORATIVE} className="size-4 text-(--sea-ink-soft)" />
					<span className="font-bold">{group.name}</span>
					<Badge variant="secondary">{rows.length}</Badge>
				</span>
				<span className="flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						icon={Pencil}
						aria-label={`Editar ${group.name}`}
						title="Editar grupo"
						onClick={onEdit}
					/>
					<Button
						variant="destructive"
						size="icon-sm"
						icon={Trash2}
						aria-label={`Eliminar ${group.name}`}
						title="Eliminar grupo"
						onClick={onDelete}
					/>
				</span>
			</div>
			<div className="mt-2 min-h-20">
				{rows.length === 0 ? (
					<p className="rounded-lg border border-dashed border-(--line) px-3 py-4 text-center text-xs text-(--sea-ink-soft)">
						Arrastra equipos aquí
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-10">#</TableHead>
								<TableHead>Equipo</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((item, index) => (
								<TeamRow
									key={item.registration.id}
									item={item}
									groupId={group.id}
									index={index}
									showIndex
								/>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</Card>
	);
}

function PoolColumn({ rows }: { rows: BoardRegistration[] }) {
	const { setNodeRef, isOver } = useDroppable({
		id: POOL_ID,
		data: { kind: "group", groupId: null, index: rows.length },
	});
	return (
		<Card
			ref={setNodeRef}
			className={cn(
				"p-3 transition-colors",
				isOver && "border-(--lagoon-deep) bg-(--chip-bg)",
			)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-2">
					<span className="font-bold">Sin grupo</span>
					<Badge variant="outline">{rows.length}</Badge>
				</span>
			</div>
			<div className="mt-2 min-h-20">
				{rows.length === 0 ? (
					<p className="rounded-lg border border-dashed border-(--line) px-3 py-4 text-center text-xs text-(--sea-ink-soft)">
						Arrastra aquí para sacar un equipo de su grupo
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Equipo</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((item, index) => (
								<TeamRow
									key={item.registration.id}
									item={item}
									groupId={null}
									index={index}
								/>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</Card>
	);
}

function TeamRow({
	item,
	groupId,
	index,
	showIndex,
}: {
	item: BoardRegistration;
	groupId: string | null;
	index: number;
	showIndex?: boolean;
}) {
	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({ id: item.registration.id });
	const { setNodeRef: setDropRef, isOver } = useDroppable({
		id: item.registration.id,
		data: { kind: "row", groupId, index },
	});
	const setRef = (node: HTMLTableRowElement | null) => {
		setDragRef(node);
		setDropRef(node);
	};
	return (
		<TableRow
			ref={setRef}
			className={cn(isDragging && "opacity-40", isOver && "bg-(--chip-bg)")}
		>
			{showIndex && (
				<TableCell className="w-10 text-(--sea-ink-soft)">
					{index + 1}
				</TableCell>
			)}
			<TableCell>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon-sm"
						icon={GripVertical}
						className="cursor-grab touch-none active:cursor-grabbing"
						aria-label={`Mover ${item.team.name}`}
						title="Arrastrar para cambiar de grupo o de posición"
						{...attributes}
						{...listeners}
					/>
					<span className="font-semibold">{item.team.name}</span>
				</div>
			</TableCell>
		</TableRow>
	);
}

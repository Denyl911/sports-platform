import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import {
	useAddTournamentMember,
	useCreateEdition,
	useDeleteEdition,
	useRemoveMembership,
	useTournamentEditions,
	useTournamentMembers,
	useUpdateEdition,
	useUpdateMembershipRole,
	useUpdateTournament,
	useUsers,
} from "@sports/api-client/hooks";
import {
	ArrowRight,
	Badge,
	Button,
	CalendarDays,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	DECORATIVE,
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
	UserCog,
	useConfirm,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AdminBreadcrumbs } from "../../../components/AdminBreadcrumbs";
import { AdminFlowSteps } from "../../../components/AdminFlowSteps";
import { api } from "../../../lib/api";
import {
	CATEGORIES,
	EDITION_STATUS,
	type EditionStatus,
} from "../../../lib/categories";
import { ROLE_INFO } from "../../../lib/roles";
import CategoryField from "../../../components/CategoryField";

export const Route = createFileRoute("/admin/tournaments/$tournamentId")({
	component: AdminTournamentDetailPage,
});

function AdminTournamentDetailPage() {
	const { tournamentId } = Route.useParams();
	const { data: tournamentData } = useQuery({
		queryKey: queryKeys.tournaments.detail(tournamentId),
		queryFn: () => unwrap(api.tournaments({ tournamentId }).get()),
	});
	const { data: editionsData, isPending: editionsPending } =
		useTournamentEditions(api, tournamentId);
	const update = useUpdateTournament(api);
	const createEdition = useCreateEdition(api);
	const deleteEdition = useDeleteEdition(api);
	const confirm = useConfirm();

	const t = tournamentData as
		| { id: string; name: string; sportId: string; description?: string | null }
		| undefined;
	const editions =
		(
			editionsData as
				| {
						items: Array<{
							id: string;
							name: string;
							status: string;
							category: string;
							startDate?: string | null;
							endDate?: string | null;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];

	const [name, setName] = React.useState("");
	const [eName, setEName] = React.useState("");
	const [eCategory, setECategory] = React.useState("open");
	const [editingEdition, setEditingEdition] = React.useState<
		(typeof editions)[number] | null
	>(null);

	React.useEffect(() => {
		if (t) setName(t.name);
	}, [t]);

	if (!t)
		return (
			<div className="space-y-3">
				<Skeleton className="h-10 w-64 rounded-xl" />
				<Skeleton className="h-40 rounded-xl" />
				<Skeleton className="h-40 rounded-xl" />
			</div>
		);

	const onUpdate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await update.mutateAsync({ tournamentId, body: { name } });
			toast.success("Torneo guardado");
		} catch (err) {
			toast.error("No se pudo guardar el torneo", getApiErrorMessage(err));
		}
	};

	const onCreateEdition = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await createEdition.mutateAsync({
				tournamentId,
				body: { name: eName, category: eCategory },
			});
			setEName("");
			toast.success("Edición creada", `«${eName.trim()}» está lista.`);
		} catch (err) {
			toast.error("No se pudo crear la edición", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<AdminBreadcrumbs
				pieces={[
					{ label: "Torneos", to: "/admin/tournaments" },
					{ label: t.name },
				]}
			/>
			<AdminFlowSteps current="edition" />
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>{t.name}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<form onSubmit={onUpdate} className="flex flex-wrap gap-3">
						<Field
							label="Nombre del torneo"
							htmlFor="tournament-name"
							className="min-w-56 flex-1"
						>
							<Input
								id="tournament-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</Field>
						<Button
							type="submit"
							icon={Save}
							className="self-end"
							disabled={update.isPending}
						>
							Guardar
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Ediciones</h3>
				<p className="mt-1 max-w-2xl text-sm text-(--sea-ink-soft)">
					La <strong>edición</strong> es la temporada concreta del torneo (2026,
					u18…). Sin edición no hay etapas ni partidos, así que este es el paso
					2: créala aquí y sigue con sus etapas.
				</p>
				<form onSubmit={onCreateEdition} className="mt-3 flex flex-wrap gap-3">
					<Field
						label="Nombre"
						htmlFor="edition-name"
						className="min-w-56 flex-1"
					>
						<Input
							id="edition-name"
							value={eName}
							onChange={(e) => setEName(e.target.value)}
							placeholder="2026"
							required
						/>
					</Field>
					<Field label="Categoría" htmlFor="edition-category" className="w-48">
						<CategoryField
							id="edition-category"
							value={eCategory}
							onChange={setECategory}
						/>
					</Field>
					<Button
						type="submit"
						icon={Plus}
						className="self-end"
						disabled={createEdition.isPending}
					>
						{createEdition.isPending ? "Creando…" : "Crear edición"}
					</Button>
				</form>
				{editionsPending ? (
					<div className="mt-4 grid gap-2 sm:grid-cols-2">
						<Skeleton className="h-28 rounded-xl" />
						<Skeleton className="h-28 rounded-xl" />
						<Skeleton className="h-28 rounded-xl" />
						<Skeleton className="h-28 rounded-xl" />
					</div>
				) : editions.length === 0 ? (
					<EmptyState
						className="mt-4"
						icon={CalendarDays}
						title="Sin ediciones todavía"
						description="Crea la primera con el formulario de arriba: es el paso 2 de la cadena y habilita las etapas, los grupos y los partidos."
					/>
				) : (
					<div className="mt-4 grid gap-2 sm:grid-cols-2">
						{editions.map((ed) => (
							<Card
								key={ed.id}
								className="group flex flex-col justify-between p-3"
							>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<div className="truncate text-sm font-bold">{ed.name}</div>
										<div className="mt-2 flex flex-wrap gap-1.5">
											<Badge variant="secondary">
										{EDITION_STATUS[ed.status as keyof typeof EDITION_STATUS]?.label ??
											ed.status}
									</Badge>
											<Badge variant="outline">
										{CATEGORIES[ed.category as keyof typeof CATEGORIES]?.label ??
											ed.category}
									</Badge>
										</div>
									</div>
									<div className="flex shrink-0 gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											icon={Pencil}
											aria-label="Editar"
											title="Editar"
											onClick={() => setEditingEdition(ed)}
										/>
										<Button
											variant="destructive"
											size="icon-sm"
											icon={Trash2}
											aria-label="Eliminar"
											title="Eliminar"
											onClick={async () => {
												const ok = await confirm({
													title: "Eliminar edición",
													description: `Se elimina «${ed.name}» y sus etapas. No se puede deshacer.`,
													confirmLabel: "Eliminar",
												});
												if (!ok) return;
												try {
													await deleteEdition.mutateAsync(ed.id);
													toast.success("Edición eliminada");
												} catch (err) {
													toast.error(
														"No se pudo eliminar la edición",
														getApiErrorMessage(err),
													);
												}
											}}
										/>
									</div>
								</div>
								<Link
									to="/admin/editions/$editionId"
									params={{ editionId: ed.id }}
									search={{ tournamentId }}
									className="mt-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-(--sea-ink) no-underline"
								>
									Etapas
									<ArrowRight
										{...DECORATIVE}
										className="size-4 transition-transform group-hover:translate-x-0.5"
									/>
								</Link>
							</Card>
						))}
					</div>
				)}
			</Card>
			{editingEdition && (
				<EditionEditDialog
					edition={editingEdition}
					onClose={() => setEditingEdition(null)}
				/>
			)}

			<Card className="p-4">
				<h3 className="font-bold">Miembros</h3>
				<TournamentMembers tournamentId={tournamentId} />
			</Card>
		</div>
	);
}

type MemberRole = "organizer" | "referee" | "statistician" | "viewer_staff";

function TournamentMembers({ tournamentId }: { tournamentId: string }) {
	const { data: membersData } = useTournamentMembers(api, tournamentId);
	const { data: usersData } = useUsers(api);
	const addMember = useAddTournamentMember(api);

	const members =
		(
			membersData as
				| {
						items: Array<{
							membership: { id: string; userId: string; role: string };
							user: { id: string; fullName: string; email: string };
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const users =
		(
			usersData as
				| {
						items: Array<{ id: string; fullName: string; email: string }>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const memberUserIds = new Set(members.map((m) => m.membership.userId));
	const candidates = users.filter((u) => !memberUserIds.has(u.id));

	const [userId, setUserId] = React.useState("");
	const [role, setRole] = React.useState<MemberRole>("referee");

	React.useEffect(() => {
		if (candidates.length && !candidates.some((c) => c.id === userId)) {
			setUserId(candidates[0]!.id);
		}
	}, [candidates, userId]);

	const onAdd = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await addMember.mutateAsync({
				userId,
				body: { tournamentId, userId, role },
			});
			toast.success("Miembro asignado");
		} catch (err) {
			toast.error("No se pudo asignar el miembro", getApiErrorMessage(err));
		}
	};

	return (
		<div className="mt-3">
			<p className="text-sm text-(--sea-ink-soft)">
				Asignar árbitro, estadístico u organizador. Requiere rol de
				organizador en el torneo.
			</p>
			<form onSubmit={onAdd} className="mt-2 flex flex-wrap gap-2">
				<Select
					value={userId}
					onChange={(e) => setUserId(e.target.value)}
					className="flex-1 min-w-40"
				>
					{candidates.map((u) => (
						<option key={u.id} value={u.id}>
							{u.fullName} ({u.email})
						</option>
					))}
				</Select>
				<Select
					value={role}
					onChange={(e) => setRole(e.target.value as MemberRole)}
					className="w-40"
				>
					{(Object.entries(ROLE_INFO) as [keyof typeof ROLE_INFO, (typeof ROLE_INFO)[keyof typeof ROLE_INFO]][]).map(([value, { label }]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
				</Select>
				<Button
					type="submit"
					icon={Plus}
					disabled={addMember.isPending || !userId}
				>
					Asignar
				</Button>
			</form>
			<div className="mt-3 space-y-1">
				{members.map(({ membership, user }) => (
					<TournamentMemberRow
						key={membership.id}
						membership={membership}
						userName={user.fullName}
						userEmail={user.email}
					/>
				))}
				{members.length === 0 && (
					<EmptyState
						icon={UserCog}
						title="Sin miembros"
						description="Asigna referees, estadísticos u organizadores con el formulario de arriba."
						className="mt-3"
					/>
				)}
			</div>
		</div>
	);
}

function TournamentMemberRow({
	membership,
	userName,
	userEmail,
}: {
	membership: { id: string; userId: string; role: string };
	userName: string;
	userEmail: string;
}) {
	const updateRole = useUpdateMembershipRole(api);
	const remove = useRemoveMembership(api);
	const confirm = useConfirm();
	const [role, setRole] = React.useState<MemberRole>(
		membership.role as MemberRole,
	);

	const onSave = async () => {
		try {
			await updateRole.mutateAsync({
				memberId: membership.id,
				body: { role },
			});
			toast.success("Rol del miembro actualizado");
		} catch (err) {
			toast.error("No se pudo actualizar el rol", getApiErrorMessage(err));
		}
	};

	const onRemove = async () => {
		const ok = await confirm({
			title: "Quitar miembro",
			description: `Se quita a «${userName}» del torneo. No se puede deshacer.`,
			confirmLabel: "Quitar",
		});
		if (!ok) return;
		try {
			await remove.mutateAsync(membership.id);
			toast.success("Miembro quitado");
		} catch (err) {
			toast.error("No se pudo quitar el miembro", getApiErrorMessage(err));
		}
	};

	return (
		<div className="demo-list-item flex flex-wrap items-center justify-between gap-2 text-sm">
			<span className="flex items-center gap-2">
				<span>
					{userName}{" "}
					<span className="text-(--sea-ink-soft)">({userEmail})</span>
				</span>
				<Badge variant="secondary">
										{ROLE_INFO[membership.role as keyof typeof ROLE_INFO]?.label ??
											membership.role}
									</Badge>
			</span>
			<div className="flex items-center gap-2">
				<Select
					value={role}
					onChange={(e) => setRole(e.target.value as MemberRole)}
					className="w-36"
				>
					{(Object.entries(ROLE_INFO) as [keyof typeof ROLE_INFO, (typeof ROLE_INFO)[keyof typeof ROLE_INFO]][]).map(([value, { label }]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
				</Select>
				<Button variant="ghost" size="sm" icon={Save} onClick={onSave}>
					Guardar
				</Button>
				<Button
					variant="destructive"
					size="sm"
					icon={Trash2}
					onClick={onRemove}
				>
					Quitar
				</Button>
			</div>
		</div>
	);
}


function EditionEditDialog({
	edition,
	onClose,
}: {
	edition: {
		id: string;
		name: string;
		status: string;
		category: string;
		startDate?: string | null;
		endDate?: string | null;
	};
	onClose: () => void;
}) {
	const updateEdition = useUpdateEdition(api);
	const [name, setName] = React.useState(edition.name);
	const [category, setCategory] = React.useState(edition.category);
	const [status, setStatus] = React.useState<EditionStatus>(
		edition.status as EditionStatus,
	);
	const [startDate, setStartDate] = React.useState(edition.startDate ?? "");
	const [endDate, setEndDate] = React.useState(edition.endDate ?? "");

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await updateEdition.mutateAsync({
				editionId: edition.id,
				body: {
					name,
					category,
					status,
					...(startDate ? { startDate } : {}),
					...(endDate ? { endDate } : {}),
				},
			});
			toast.success("Edición guardada");
			onClose();
		} catch (err) {
			toast.error("No se pudo guardar la edición", getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Editar edición ${edition.name}`}
			description="El backend valida la transición de estado y el rango de fechas."
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						size="sm"
						icon={Save}
						onClick={onSubmit}
						disabled={updateEdition.isPending}
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
										<Label>Categoría</Label>
										<CategoryField
											id="edition-edit-category"
											value={category}
											onChange={setCategory}
										/>
									</div>
					<div>
						<Label>Estado</Label>
						<Select
							value={status}
							onChange={(e) => setStatus(e.target.value as EditionStatus)}
						>
							{(Object.entries(EDITION_STATUS) as [keyof typeof EDITION_STATUS, (typeof EDITION_STATUS)[keyof typeof EDITION_STATUS]][]).map(([value, { label }]) => (
														<option key={value} value={value}>
															{label}
														</option>
													))}
						</Select>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<Label>Inicio</Label>
						<Input
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div>
						<Label>Fin</Label>
						<Input
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
				</div>
			</form>
		</EditDialog>
	);
}

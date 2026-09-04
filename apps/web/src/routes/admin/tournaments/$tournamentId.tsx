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
	Badge,
	Button,
	Card,
	CardContent,
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

export const Route = createFileRoute("/admin/tournaments/$tournamentId")({
	component: AdminTournamentDetailPage,
});

function AdminTournamentDetailPage() {
	const { tournamentId } = Route.useParams();
	const { data: tournamentData } = useQuery({
		queryKey: queryKeys.tournaments.detail(tournamentId),
		queryFn: () => unwrap(api.tournaments({ tournamentId }).get()),
	});
	const { data: editionsData } = useTournamentEditions(api, tournamentId);
	const update = useUpdateTournament(api);
	const createEdition = useCreateEdition(api);
	const deleteEdition = useDeleteEdition(api);

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
	const [error, setError] = React.useState<string | null>(null);
	const [editingEdition, setEditingEdition] = React.useState<
		(typeof editions)[number] | null
	>(null);

	React.useEffect(() => {
		if (t) setName(t.name);
	}, [t]);

	if (!t) return <div className="demo-center text-sm">Cargando torneo…</div>;

	const onUpdate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await update.mutateAsync({ tournamentId, body: { name } });
		} catch (err) {
			setError(getApiErrorMessage(err));
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
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/tournaments" className="text-sm text-(--sea-ink-soft)">
				← Volver a torneos
			</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>{t.name}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<form onSubmit={onUpdate} className="flex gap-2">
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="flex-1"
						/>
						<Button type="submit" disabled={update.isPending}>
							Guardar
						</Button>
					</form>
					{error && (
						<div className="demo-alert-danger mt-2 text-sm">{error}</div>
					)}
				</CardContent>
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Ediciones</h3>
				<form onSubmit={onCreateEdition} className="mt-3 flex flex-wrap gap-2">
					<Input
						value={eName}
						onChange={(e) => setEName(e.target.value)}
						placeholder="2025"
						required
						className="min-w-32 flex-1"
					/>
					<Select
						value={eCategory}
						onChange={(e) => setECategory(e.target.value)}
					>
						<option value="open">open</option>
						<option value="u18">u18</option>
						<option value="senior">senior</option>
					</Select>
					<Button type="submit" disabled={createEdition.isPending}>
						Crear edición
					</Button>
				</form>
				<div className="mt-4 grid gap-2 sm:grid-cols-2">
					{editions.map((ed) => (
						<Card key={ed.id} className="p-3 flex flex-col">
							<Link
								to="/admin/editions/$editionId"
								params={{ editionId: ed.id }}
								search={{ tournamentId }}
								className="no-underline"
							>
								<div className="font-bold text-sm">{ed.name}</div>
								<Badge variant="secondary">{ed.status}</Badge>{" "}
								<Badge variant="outline">{ed.category}</Badge>
							</Link>
							<div className="mt-2 flex gap-2 self-start">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setEditingEdition(ed)}
								>
									Editar
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={async () => {
										if (!confirm(`¿Eliminar edición ${ed.name}?`)) return;
										try {
											await deleteEdition.mutateAsync(ed.id);
										} catch (err) {
											setError(getApiErrorMessage(err));
										}
									}}
								>
									Eliminar
								</Button>
							</div>
						</Card>
					))}
				</div>
				{editions.length === 0 && (
					<div className="text-sm text-(--sea-ink-soft) mt-2">
						Sin ediciones
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
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (candidates.length && !candidates.some((c) => c.id === userId)) {
			setUserId(candidates[0]!.id);
		}
	}, [candidates, userId]);

	const onAdd = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await addMember.mutateAsync({
				userId,
				body: { tournamentId, userId, role },
			});
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="mt-3">
			<p className="text-sm text-(--sea-ink-soft)">
				Asignar referee / statistician / organizer. Requiere organizer del
				torneo.
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
					<option value="organizer">organizer</option>
					<option value="referee">referee</option>
					<option value="statistician">statistician</option>
					<option value="viewer_staff">viewer_staff</option>
				</Select>
				<Button type="submit" disabled={addMember.isPending || !userId}>
					Asignar
				</Button>
			</form>
			{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
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
					<div className="text-sm text-(--sea-ink-soft)">Sin miembros</div>
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
	const [role, setRole] = React.useState<MemberRole>(
		membership.role as MemberRole,
	);
	const [error, setError] = React.useState<string | null>(null);

	const onSave = async () => {
		setError(null);
		try {
			await updateRole.mutateAsync({
				memberId: membership.id,
				body: { role },
			});
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	const onRemove = async () => {
		if (!confirm(`¿Quitar a ${userName} del torneo?`)) return;
		setError(null);
		try {
			await remove.mutateAsync(membership.id);
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="demo-list-item flex flex-wrap items-center justify-between gap-2 text-sm">
			<span className="flex items-center gap-2">
				<span>
					{userName}{" "}
					<span className="text-(--sea-ink-soft)">({userEmail})</span>
				</span>
				<Badge variant="secondary">{membership.role}</Badge>
			</span>
			<div className="flex items-center gap-2">
				<Select
					value={role}
					onChange={(e) => setRole(e.target.value as MemberRole)}
					className="w-36"
				>
					<option value="organizer">organizer</option>
					<option value="referee">referee</option>
					<option value="statistician">statistician</option>
					<option value="viewer_staff">viewer_staff</option>
				</Select>
				<Button variant="ghost" size="sm" onClick={onSave}>
					Guardar
				</Button>
				<Button variant="destructive" size="sm" onClick={onRemove}>
					Quitar
				</Button>
			</div>
			{error && <div className="demo-alert-danger w-full text-xs">{error}</div>}
		</div>
	);
}

type EditionStatus =
	| "draft"
	| "registration"
	| "in_progress"
	| "finished"
	| "archived"
	| "cancelled";

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
	const [error, setError] = React.useState<string | null>(null);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
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
			onClose();
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Editar edición ${edition.name}`}
			description="El backend valida la transición de estado y el rango de fechas."
			error={error}
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button
						size="sm"
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
						<Select
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							<option value="open">open</option>
							<option value="u18">u18</option>
							<option value="senior">senior</option>
						</Select>
					</div>
					<div>
						<Label>Estado</Label>
						<Select
							value={status}
							onChange={(e) => setStatus(e.target.value as EditionStatus)}
						>
							<option value="draft">draft</option>
							<option value="registration">registration</option>
							<option value="in_progress">in_progress</option>
							<option value="finished">finished</option>
							<option value="archived">archived</option>
							<option value="cancelled">cancelled</option>
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

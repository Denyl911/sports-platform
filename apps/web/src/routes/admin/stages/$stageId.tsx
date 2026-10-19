import { getApiErrorMessage } from "@sports/api-client";
import {
	useAddPlayerToRoster,
	useCreateGroup,
	useCreateMatch,
	useDeleteGroup,
	useGroupsByStage,
	usePlayers,
	useRegisterTeam,
	useRegistrationsByStage,
	useRemovePlayerFromRoster,
	useRoster,
	useTeams,
	useUnregisterTeam,
	useUpdateGroup,
	useUpdateRegistrationGroup,
	useUpdateRosterEntry,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
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
	useStageName,
	useTournamentName,
} from "../../../components/AdminBreadcrumbs";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/stages/$stageId")({
	component: AdminStageDetailPage,
});

function AdminStageDetailPage() {
	const { stageId } = Route.useParams();
	// editionId/tournamentId llegan por search desde la página padre
	// (no existen endpoints GET single de stage/edition en la API).
	const search = Route.useSearch() as {
		editionId?: string;
		tournamentId?: string;
	};
	const editionId = search.editionId ?? null;
	const tournamentId = search.tournamentId ?? null;
	const tournamentName = useTournamentName(tournamentId);
	const editionName = useEditionName(tournamentId, editionId ?? "");
	const stageName = useStageName(editionId, stageId);

	const { data: groupsData, isPending: groupsPending } = useGroupsByStage(
		api,
		stageId,
	);
	const { data: regsData } = useRegistrationsByStage(api, stageId);
	const { data: teamsData } = useTeams(api);
	const { data: playersData } = usePlayers(api);

	const createGroup = useCreateGroup(api);
	const deleteGroup = useDeleteGroup(api);
	const registerTeam = useRegisterTeam(api);
	const confirm = useConfirm();

	const groups =
		(
			groupsData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];
	const registrations =
		(
			regsData as
				| {
						items: Array<{
							registration: {
								id: string;
								teamId: string;
								groupId: string | null;
							};
							team: { id: string; name: string };
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const teams =
		(
			teamsData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];
	const players =
		(
			playersData as
				| {
						items: Array<{ id: string; firstName: string; lastName: string }>;
						total: number;
				  }
				| undefined
		)?.items ?? [];

	const [groupName, setGroupName] = React.useState("");
	const [teamId, setTeamId] = React.useState("");
	const [editingGroup, setEditingGroup] = React.useState<
		(typeof groups)[number] | null
	>(null);

	React.useEffect(() => {
		if (teams.length && !teamId) setTeamId(teams[0]!.id);
	}, [teams, teamId]);

	const onCreateGroup = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await createGroup.mutateAsync({
				stageId,
				body: { name: groupName },
			});
			setGroupName("");
			toast.success("Grupo creado");
		} catch (err) {
			toast.error("No se pudo crear el grupo", getApiErrorMessage(err));
		}
	};

	const onDeleteGroup = async (groupId: string, name: string) => {
		const ok = await confirm({
			title: "Eliminar grupo",
			description: `Se elimina «${name}» y se sueltan sus inscripciones. No se puede deshacer.`,
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await deleteGroup.mutateAsync(groupId);
			toast.success("Grupo eliminado");
		} catch (err) {
			toast.error("No se pudo eliminar el grupo", getApiErrorMessage(err));
		}
	};

	const onRegister = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await registerTeam.mutateAsync({ stageId, body: { teamId } });
			toast.success("Equipo inscrito");
		} catch (err) {
			toast.error("No se pudo inscribir el equipo", getApiErrorMessage(err));
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
					...(editionId
						? [
								{
									label: editionName,
									to: `/admin/editions/${editionId}?tournamentId=${tournamentId ?? ""}`,
								},
							]
						: []),
					{ label: stageName },
				]}
			/>
			<div className="grid gap-6 lg:grid-cols-2">
				<Card className="p-4">
					<h3 className="font-bold">Grupos</h3>
					<form onSubmit={onCreateGroup} className="mt-2 flex gap-2">
						<Input
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							placeholder="Grupo A"
							required
							className="flex-1"
						/>
						<Button type="submit" disabled={createGroup.isPending}>
							Crear
						</Button>
					</form>
					{groupsPending ? (
						<div className="mt-3 flex flex-col gap-2">
							<Skeleton className="h-10 rounded-xl" />
							<Skeleton className="h-10 rounded-xl" />
						</div>
					) : (
						<div className="mt-3 flex flex-col gap-2">
							{groups.map((g) => (
								<div
									key={g.id}
									className="flex items-center justify-between rounded-xl border border-(--line) bg-(--chip-bg) px-3 py-2"
								>
									<Link
										to="/standings/$groupId"
										params={{ groupId: g.id }}
										className="no-underline"
									>
										<Badge variant="secondary">{g.name}</Badge>
									</Link>
									<div className="flex gap-1">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setEditingGroup(g)}
										>
											Editar
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDeleteGroup(g.id, g.name)}
										>
											Eliminar
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
					{groups.length === 0 && (
						<EmptyState
							title="Sin grupos"
							description="Crea el primer grupo de la etapa con el formulario de arriba."
							className="mt-3"
						/>
					)}
				</Card>

				<Card className="p-4">
					<h3 className="font-bold">Inscripciones</h3>
					<form onSubmit={onRegister} className="mt-2 flex gap-2">
						<Select
							value={teamId}
							onChange={(e) => setTeamId(e.target.value)}
							className="flex-1"
						>
							{teams.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</Select>
						<Button type="submit" disabled={registerTeam.isPending}>
							Inscribir
						</Button>
					</form>
					<div className="mt-3 space-y-1">
						{registrations.map(({ registration, team }) => (
							<RegistrationRow
								key={registration.id}
								registration={registration}
								team={team}
								groups={groups}
							/>
						))}
						{registrations.length === 0 && (
							<EmptyState
								title="Sin inscripciones"
								description="Inscribe el primer equipo de la etapa con el formulario de arriba."
							/>
						)}
					</div>
				</Card>
			</div>

			<Card className="p-4">
				<h3 className="font-bold">Fixture rápido</h3>
				{tournamentId ? (
					<CreateMatchInline
						stageId={stageId}
						tournamentId={tournamentId}
						groups={groups}
						teams={teams}
					/>
				) : (
					<div className="text-sm text-(--sea-ink-soft)">
						No llega el torneo por search params: vuelve a la edición para
						inscribir partidos.
					</div>
				)}
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Roster</h3>
				{editionId && teams[0] ? (
					<RosterSection
						editionId={editionId}
						teamId={teams[0].id}
						teams={teams}
						players={players}
					/>
				) : (
					<span className="text-sm">Sin equipos o edición</span>
				)}
			</Card>
			{editingGroup && (
				<GroupEditDialog
					group={editingGroup}
					onClose={() => setEditingGroup(null)}
				/>
			)}
		</div>
	);
}

function GroupEditDialog({
	group,
	onClose,
}: {
	group: { id: string; name: string };
	onClose: () => void;
}) {
	const updateGroup = useUpdateGroup(api);
	const [name, setName] = React.useState(group.name);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await updateGroup.mutateAsync({ groupId: group.id, body: { name } });
			toast.success("Grupo actualizado");
			onClose();
		} catch (err) {
			toast.error("No se pudo guardar el grupo", getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Editar grupo ${group.name}`}
			description="El nombre debe ser único dentro de la etapa."
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button size="sm" onClick={onSubmit} disabled={updateGroup.isPending}>
						Guardar
					</Button>
				</>
			}
		>
			<form onSubmit={onSubmit}>
				<Label>Nombre</Label>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
				/>
			</form>
		</EditDialog>
	);
}

function RegistrationRow({
	registration,
	team,
	groups,
}: {
	registration: { id: string; teamId: string; groupId: string | null };
	team: { id: string; name: string };
	groups: Array<{ id: string; name: string }>;
}) {
	const updateGroup = useUpdateRegistrationGroup(api);
	const unregister = useUnregisterTeam(api);
	const confirm = useConfirm();
	const [groupId, setGroupId] = React.useState(registration.groupId ?? "");
	const onMove = async () => {
		try {
			await updateGroup.mutateAsync({
				id: registration.id,
				body: { groupId: groupId || null },
			});
			toast.success("Inscripción movida de grupo");
		} catch {
			toast.error("No se pudo mover la inscripción");
		}
	};
	const onRemove = async () => {
		const ok = await confirm({
			title: "Quitar inscripción",
			description: `Se quita a «${team.name}» de la etapa. No se puede deshacer.`,
			confirmLabel: "Quitar",
		});
		if (!ok) return;
		try {
			await unregister.mutateAsync(registration.id);
			toast.success("Inscripción quitada");
		} catch {
			toast.error("No se pudo quitar la inscripción");
		}
	};
	return (
		<div className="demo-list-item flex flex-wrap items-center justify-between gap-2 text-sm">
			<span>{team.name}</span>
			<div className="flex items-center gap-2">
				<Select
					value={groupId}
					onChange={(e) => setGroupId(e.target.value)}
					className="w-32"
				>
					<option value="">sin grupo</option>
					{groups.map((g) => (
						<option key={g.id} value={g.id}>
							{g.name}
						</option>
					))}
				</Select>
				<Button variant="ghost" size="sm" onClick={onMove}>
					Mover
				</Button>
				<Button variant="destructive" size="sm" onClick={onRemove}>
					Quitar
				</Button>
			</div>
		</div>
	);
}

function CreateMatchInline({
	stageId,
	tournamentId,
	groups,
	teams,
}: {
	stageId: string;
	tournamentId: string;
	groups: Array<{ id: string; name: string }>;
	teams: Array<{ id: string; name: string }>;
}) {
	const createMatch = useCreateMatch(api);
	const [homeTeamId, setHomeTeamId] = React.useState("");
	const [awayTeamId, setAwayTeamId] = React.useState("");
	const [groupId, setGroupId] = React.useState<string>("");
	React.useEffect(() => {
		if (teams.length >= 2) {
			setHomeTeamId(teams[0]!.id);
			setAwayTeamId(teams[1]!.id);
		}
	}, [teams]);
	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await createMatch.mutateAsync({
				stageId,
				groupId: groupId || null,
				homeTeamId,
				awayTeamId,
				tournamentId,
			});
			toast.success("Partido creado");
		} catch (err: unknown) {
			toast.error("No se pudo crear el partido", getApiErrorMessage(err));
		}
	};
	return (
		<form onSubmit={onCreate} className="mt-2 flex flex-wrap gap-2">
			<Badge variant="outline">Torneo {tournamentId.slice(0, 8)}</Badge>
			<Select
				value={homeTeamId}
				onChange={(e) => setHomeTeamId(e.target.value)}
				className="w-40"
			>
				{teams.map((t) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
			</Select>
			<span className="self-center">vs</span>
			<Select
				value={awayTeamId}
				onChange={(e) => setAwayTeamId(e.target.value)}
				className="w-40"
			>
				{teams.map((t) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
			</Select>
			<Select
				value={groupId}
				onChange={(e) => setGroupId(e.target.value)}
				className="w-32"
			>
				<option value="">Sin grupo</option>
				{groups.map((g) => (
					<option key={g.id} value={g.id}>
						{g.name}
					</option>
				))}
			</Select>
			<Button type="submit" disabled={createMatch.isPending}>
				Crear partido
			</Button>
		</form>
	);
}

function RosterSection({
	editionId,
	teamId,
	teams,
	players,
}: {
	editionId: string;
	teamId: string;
	teams: Array<{ id: string; name: string }>;
	players: Array<{ id: string; firstName: string; lastName: string }>;
}) {
	const [selectedTeamId, setSelectedTeamId] = React.useState(teamId);
	React.useEffect(() => setSelectedTeamId(teamId), [teamId]);
	const { data: rosterData } = useRoster(api, editionId, selectedTeamId);
	const addPlayer = useAddPlayerToRoster(api);
	const removePlayer = useRemovePlayerFromRoster(api);
	const confirm = useConfirm();
	const [playerId, setPlayerId] = React.useState("");
	React.useEffect(() => {
		if (players.length) setPlayerId(players[0]!.id);
	}, [players]);
	const onAdd = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await addPlayer.mutateAsync({
				editionId,
				teamId: selectedTeamId,
				body: { playerId },
			});
			toast.success("Jugador añadido al plantel");
		} catch {
			toast.error("No se pudo añadir el jugador");
		}
	};
	const onRemovePlayer = async (rosterId: string, playerName: string) => {
		const ok = await confirm({
			title: "Quitar jugador",
			description: `Se quita a «${playerName}» del plantel. No se puede deshacer.`,
			confirmLabel: "Quitar",
		});
		if (!ok) return;
		try {
			await removePlayer.mutateAsync(rosterId);
			toast.success("Jugador quitado del plantel");
		} catch {
			toast.error("No se pudo quitar al jugador del plantel");
		}
	};
	const roster =
		(
			rosterData as
				| {
						items: Array<{
							roster: {
								id: string;
								jerseyNumber?: number | null;
								position?: string | null;
								isCaptain?: boolean | null;
							};
							player: { id: string; firstName: string; lastName: string };
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const [editingEntry, setEditingEntry] = React.useState<
		(typeof roster)[number] | null
	>(null);
	return (
		<div className="mt-2 space-y-3">
			<Select
				value={selectedTeamId}
				onChange={(e) => setSelectedTeamId(e.target.value)}
				className="w-full"
			>
				{teams.map((t) => (
					<option key={t.id} value={t.id}>
						{t.name}
					</option>
				))}
			</Select>
			<form onSubmit={onAdd} className="flex gap-2">
				<Select
					value={playerId}
					onChange={(e) => setPlayerId(e.target.value)}
					className="flex-1"
				>
					{players.map((p) => (
						<option key={p.id} value={p.id}>
							{p.firstName} {p.lastName}
						</option>
					))}
				</Select>
				<Button type="submit" disabled={addPlayer.isPending}>
					Añadir
				</Button>
			</form>
			<div className="space-y-1">
				{roster.length === 0 ? (
					<EmptyState
						title="Plantel vacío"
						description="Añade jugadores al plantel con el formulario de arriba."
						className="mt-2"
					/>
				) : (
					<div className="space-y-1">
						{roster.map(({ roster: r, player }) => (
							<div
								key={r.id}
								className="demo-list-item flex items-center justify-between gap-2 text-sm"
							>
								<span className="flex flex-wrap items-center gap-1">
									<span>
										{player.firstName} {player.lastName}
									</span>
									{r.jerseyNumber != null && (
										<Badge variant="outline">#{r.jerseyNumber}</Badge>
									)}
									{r.position && (
										<Badge variant="secondary">{r.position}</Badge>
									)}
									{r.isCaptain && <Badge>capitán</Badge>}
								</span>
								<span className="flex gap-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setEditingEntry({ roster: r, player })}
									>
										Editar
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() =>
											onRemovePlayer(
												r.id,
												`${player.firstName} ${player.lastName}`,
											)
										}
									>
										Quitar
									</Button>
								</span>
							</div>
						))}
					</div>
				)}
			</div>
			{editingEntry && (
				<RosterEditDialog
					entry={editingEntry.roster}
					playerName={`${editingEntry.player.firstName} ${editingEntry.player.lastName}`}
					onClose={() => setEditingEntry(null)}
				/>
			)}
		</div>
	);
}

function RosterEditDialog({
	entry,
	playerName,
	onClose,
}: {
	entry: {
		id: string;
		jerseyNumber?: number | null;
		position?: string | null;
		isCaptain?: boolean | null;
	};
	playerName: string;
	onClose: () => void;
}) {
	const updateEntry = useUpdateRosterEntry(api);
	const [jersey, setJersey] = React.useState(
		entry.jerseyNumber != null ? String(entry.jerseyNumber) : "",
	);
	const [position, setPosition] = React.useState(entry.position ?? "");
	const [isCaptain, setIsCaptain] = React.useState(entry.isCaptain ?? false);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await updateEntry.mutateAsync({
				id: entry.id,
				body: {
					jerseyNumber: jersey === "" ? null : Number(jersey),
					position: position || null,
					isCaptain,
				},
			});
			toast.success("Ficha del jugador actualizada");
			onClose();
		} catch (err) {
			toast.error("No se pudo actualizar la ficha", getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title={`Editar ${playerName}`}
			description="El backend valida dorsal 0–99 libre y capitán único por equipo."
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button size="sm" onClick={onSubmit} disabled={updateEntry.isPending}>
						Guardar
					</Button>
				</>
			}
		>
			<form onSubmit={onSubmit} className="space-y-3">
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<Label>Dorsal (0–99)</Label>
						<Input
							type="number"
							min={0}
							max={99}
							value={jersey}
							onChange={(e) => setJersey(e.target.value)}
							placeholder="Sin dorsal"
						/>
					</div>
					<div>
						<Label>Posición</Label>
						<Input
							value={position}
							onChange={(e) => setPosition(e.target.value)}
							placeholder="DEL / DEF / ..."
							maxLength={30}
						/>
					</div>
				</div>
				<div>
					<Label>Capitán</Label>
					<Select
						value={String(isCaptain)}
						onChange={(e) => setIsCaptain(e.target.value === "true")}
					>
						<option value="false">no</option>
						<option value="true">sí</option>
					</Select>
				</div>
			</form>
		</EditDialog>
	);
}

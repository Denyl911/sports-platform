import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import {
	useAddPlayerToRoster,
	usePlayers,
	useRemovePlayerFromRoster,
	useRoster,
	useUpdateRosterEntry,
	useUpdateTeam,
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
	Pencil,
	Plus,
	Save,
	Select,
	Skeleton,
	Trash2,
	toast,
	Users,
	useConfirm,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { AdminBreadcrumbs } from "../../../components/AdminBreadcrumbs";
import CategoryField from "../../../components/CategoryField";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/teams/$teamId")({
	component: AdminTeamDetailPage,
});

function AdminTeamDetailPage() {
	const { teamId } = Route.useParams();
	const search = Route.useSearch() as { editionId?: string };
	const editionId = search.editionId ?? null;
	const { data, isPending } = useQuery({
		queryKey: queryKeys.teams.detail(teamId),
		queryFn: () => unwrap(api.teams({ id: teamId }).get()),
	});
	const team = data as
		| {
				id: string;
				name: string;
				clubId: string | null;
				category?: string | null;
		  }
		| undefined;
	const update = useUpdateTeam(api);
	const [name, setName] = React.useState("");
	const [category, setCategory] = React.useState("open");
	React.useEffect(() => {
		if (team) {
			setName(team.name);
			setCategory(team.category ?? "open");
		}
	}, [team]);
	if (isPending) return <Skeleton className="h-64 rounded-xl" />;
	if (!team)
		return (
			<EmptyState
				icon={Users}
				title="Equipo no encontrado"
				description="El equipo no existe o la consulta falló. Vuelve a la lista para intentarlo."
			/>
		);
	const onUpdate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await update.mutateAsync({
				id: teamId,
				body: { name, category } as never,
			});
			toast.success("Equipo guardado");
		} catch (err) {
			toast.error("No se pudo guardar el equipo", getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-6">
			<AdminBreadcrumbs
				pieces={[
					{ label: "Admin", to: "/admin" },
					{ label: "Equipos", to: "/admin/teams" },
					{ label: team.name },
				]}
			/>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>Editar equipo</CardTitle>
				</CardHeader>
				<form onSubmit={onUpdate} className="space-y-3">
					<div>
						<Label>Nombre</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Categoría</Label>
						<CategoryField
							id="team-category"
							value={category}
							onChange={setCategory}
						/>
					</div>
					<Button type="submit" icon={Save} disabled={update.isPending}>
						Guardar
					</Button>
				</form>
			</Card>
			<RosterCard teamId={teamId} teamName={team.name} editionId={editionId} />
		</div>
	);
}

function RosterCard({
	teamId,
	teamName,
	editionId,
}: {
	teamId: string;
	teamName: string;
	editionId: string | null;
}) {
	const { data: playersData } = usePlayers(api);
	const players =
		(
			playersData as
				| {
						items: Array<{ id: string; firstName: string; lastName: string }>;
						total: number;
				  }
				| undefined
		)?.items ?? [];

	return (
		<Card className="p-4">
			<CardHeader className="p-0 pb-2">
				<CardTitle>Plantilla de {teamName}</CardTitle>
			</CardHeader>
			{!editionId ? (
				<p className="text-sm text-(--sea-ink-soft)">
					Abre esta página desde una etapa con «Gestionar plantilla» para elegir
					la edición cuyo plantel quieres editar.
				</p>
			) : (
				<RosterSection
					editionId={editionId}
					teamId={teamId}
					players={players}
				/>
			)}
		</Card>
	);
}

function RosterSection({
	editionId,
	teamId,
	players,
}: {
	editionId: string;
	teamId: string;
	players: Array<{ id: string; firstName: string; lastName: string }>;
}) {
	const { data: rosterData, isPending } = useRoster(api, editionId, teamId);
	const addPlayer = useAddPlayerToRoster(api);
	const removePlayer = useRemovePlayerFromRoster(api);
	const confirm = useConfirm();
	const [playerId, setPlayerId] = React.useState("");

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
	const availablePlayers = players.filter(
		(player) => !roster.some((entry) => entry.player.id === player.id),
	);

	React.useEffect(() => {
		if (
			availablePlayers.length &&
			!availablePlayers.some((player) => player.id === playerId)
		) {
			setPlayerId(availablePlayers[0]!.id);
		}
	}, [availablePlayers, playerId]);

	const onAdd = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		if (!playerId) return;
		try {
			await addPlayer.mutateAsync({
				editionId,
				teamId,
				body: { playerId },
			});
			toast.success("Jugador añadido a la plantilla");
		} catch (err) {
			toast.error("No se pudo añadir el jugador", getApiErrorMessage(err));
		}
	};

	const onRemovePlayer = async (rosterId: string, playerName: string) => {
		const ok = await confirm({
			title: "Quitar jugador",
			description: `Se quita a «${playerName}» de la plantilla. No se puede deshacer.`,
			confirmLabel: "Quitar",
		});
		if (!ok) return;
		try {
			await removePlayer.mutateAsync(rosterId);
			toast.success("Jugador quitado de la plantilla");
		} catch {
			toast.error("No se pudo quitar al jugador de la plantilla");
		}
	};

	const [editingEntry, setEditingEntry] = React.useState<
		(typeof roster)[number] | null
	>(null);

	return (
		<div className="space-y-3">
			{players.length === 0 ? (
				<p className="text-sm text-(--sea-ink-soft)">
					No hay jugadores en el catálogo todavía. Créalos en{" "}
					<Link to="/admin/players" className="font-semibold">
						Jugadores
					</Link>{" "}
					para armar la plantilla.
				</p>
			) : availablePlayers.length === 0 ? (
				<p className="text-sm text-(--sea-ink-soft)">
					Todos los jugadores del catálogo ya están en esta plantilla.
				</p>
			) : (
				<form onSubmit={onAdd} className="flex flex-wrap gap-3">
					<Field
						label="Jugador"
						htmlFor="roster-player"
						className="min-w-40 flex-1"
					>
						<Select
							id="roster-player"
							value={playerId}
							onChange={(e) => setPlayerId(e.target.value)}
						>
							{availablePlayers.map((player) => (
								<option key={player.id} value={player.id}>
									{player.firstName} {player.lastName}
								</option>
							))}
						</Select>
					</Field>
					<Button
						type="submit"
						icon={Plus}
						className="self-end"
						disabled={addPlayer.isPending || !playerId}
					>
						Añadir
					</Button>
				</form>
			)}
			{isPending ? (
				<Skeleton className="h-20 rounded-xl" />
			) : roster.length === 0 ? (
				<EmptyState
					icon={Users}
					title="Plantilla vacía"
					description="Añade jugadores del catálogo con el formulario de arriba."
				/>
			) : (
				<div className="space-y-1">
					{roster.map(({ roster: entry, player }) => (
						<div
							key={entry.id}
							className="demo-list-item flex items-center justify-between gap-2 text-sm"
						>
							<span className="flex flex-wrap items-center gap-1">
								<span>
									{player.firstName} {player.lastName}
								</span>
								{entry.jerseyNumber != null && (
									<Badge variant="outline">#{entry.jerseyNumber}</Badge>
								)}
								{entry.position && (
									<Badge variant="secondary">{entry.position}</Badge>
								)}
								{entry.isCaptain && <Badge>capitán</Badge>}
							</span>
							<span className="flex gap-1">
								<Button
									variant="ghost"
									size="icon-sm"
									icon={Pencil}
									aria-label={`Editar ${player.firstName} ${player.lastName}`}
									title="Editar ficha"
									onClick={() => setEditingEntry({ roster: entry, player })}
								/>
								<Button
									variant="destructive"
									size="sm"
									icon={Trash2}
									onClick={() =>
										onRemovePlayer(
											entry.id,
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
					<Button
						size="sm"
						icon={Save}
						onClick={onSubmit}
						disabled={updateEntry.isPending}
					>
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

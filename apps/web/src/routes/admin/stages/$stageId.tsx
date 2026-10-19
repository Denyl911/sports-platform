import { getApiErrorMessage } from "@sports/api-client";
import {
	useAddPlayerToRoster,
	useAdvanceStage,
	useClubs,
	useCreateClub,
	useCreateGroup,
	useCreateInvitation,
	useCreateMatch,
	useCreateTeam,
	useDeleteGroup,
	useGenerateBracket,
	useGroupsByStage,
	usePlayers,
	useRegisterTeam,
	useRegistrationsByStage,
	useRemovePlayerFromRoster,
	useRoster,
	useStageQualifiers,
	useStagesByEdition,
	useTeams,
	useUnregisterTeam,
	useUpdateGroup,
	useUpdateRegistrationGroup,
	useUpdateRosterEntry,
	useUpdateStage,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
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
	Table2,
	Trash2,
	toast,
	Users,
	useConfirm,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import * as React from "react";
import {
	AdminBreadcrumbs,
	useEditionName,
	useStageName,
	useTournamentName,
} from "../../../components/AdminBreadcrumbs";
import { AdminFlowSteps } from "../../../components/AdminFlowSteps";
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
	const createTeam = useCreateTeam(api);
	const { data: clubsData } = useClubs(api);
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

	// Avance entre etapas: la regla vive en la etapa (advancementRules) y el
	// destino es la etapa con el menor sequenceOrder mayor dentro de la edición.
	const { data: editionStagesData } = useStagesByEdition(api, editionId ?? "");
	const editionStages =
		(
			editionStagesData as
				| {
						items: Array<{
							id: string;
							name: string;
							stageType: string;
							sequenceOrder: number;
							advancementRules?: {
								qualifyPerGroup?: number;
								seeding?: string;
							} | null;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const currentStage = editionStages.find((s) => s.id === stageId);
	const nextStage = editionStages
		.filter((s) => s.sequenceOrder > (currentStage?.sequenceOrder ?? 0))
		.sort((a, b) => a.sequenceOrder - b.sequenceOrder)[0];
	const isSource = currentStage?.stageType === "round_robin";
	const isTarget = currentStage?.stageType === "single_elimination";

	const { data: qualifiersData } = useStageQualifiers(api, stageId);
	const qualifiers =
		(
			qualifiersData as
				| {
						rule: { qualifyPerGroup?: number; seeding?: string } | null;
						items: Array<{
							groupId: string;
							groupName: string;
							position: number;
							qualified: boolean;
							team: { id: string; name: string };
						}>;
				  }
				| undefined
		)?.items ?? [];
	const qualifiersRule =
		(
			qualifiersData as
				| { rule: { qualifyPerGroup?: number; seeding?: string } | null }
				| undefined
		)?.rule ?? null;

	const advanceStage = useAdvanceStage(api);
	const generateBracket = useGenerateBracket(api);
	const updateStage = useUpdateStage(api);

	const [qualifyPerGroup, setQualifyPerGroup] = React.useState("");
	const [seeding, setSeeding] = React.useState("linear");

	React.useEffect(() => {
		if (currentStage?.advancementRules?.qualifyPerGroup) {
			setQualifyPerGroup(String(currentStage.advancementRules.qualifyPerGroup));
		}
		if (currentStage?.advancementRules?.seeding) {
			setSeeding(currentStage.advancementRules.seeding);
		}
	}, [currentStage]);

	const onSaveAdvancement = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await updateStage.mutateAsync({
				stageId,
				body: {
					advancementRules: {
						qualifyPerGroup: qualifyPerGroup
							? Number(qualifyPerGroup)
							: undefined,
						seeding: seeding as "cross" | "linear",
					},
				} as never,
			});
			toast.success("Regla de avance guardada");
		} catch (err) {
			toast.error("No se pudo guardar la regla", getApiErrorMessage(err));
		}
	};

	const onAdvance = async () => {
		try {
			const r = await advanceStage.mutateAsync(stageId);
			if (r.synced) {
				toast.success(`Avance aplicado: ${r.registered} clasificados`);
			} else {
				toast.info(`Sin cambios: ${r.reason}`);
			}
		} catch (err) {
			toast.error("No se pudo aplicar el avance", getApiErrorMessage(err));
		}
	};

	const onGenerateBracket = async (force = false) => {
		try {
			const r = await generateBracket.mutateAsync({ stageId, force });
			toast.success(`Llave generada: ${r.created} partidos`);
		} catch (err) {
			toast.error("No se pudo generar la llave", getApiErrorMessage(err));
		}
	};

	const [groupName, setGroupName] = React.useState("");
	const [teamId, setTeamId] = React.useState("");
	const [editingGroup, setEditingGroup] = React.useState<
		(typeof groups)[number] | null
	>(null);
	const [showCreateTeam, setShowCreateTeam] = React.useState(false);
	const [newTeamName, setNewTeamName] = React.useState("");
	const [newTeamClubId, setNewTeamClubId] = React.useState("");
	const [showInviteDialog, setShowInviteDialog] = React.useState(false);
	const [inviteLink, setInviteLink] = React.useState<string | null>(null);
	const createInvitation = useCreateInvitation(api);

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

	const onCreateTeam = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			const team = (await createTeam.mutateAsync({
				name: newTeamName,
				clubId: newTeamClubId || undefined,
			})) as { id: string };
			// Inscribir automáticamente el equipo recién creado
			await registerTeam.mutateAsync({ stageId, body: { teamId: team.id } });
			toast.success("Equipo creado e inscribe equipos para crear el fixture");
			setShowCreateTeam(false);
			setNewTeamName("");
			setNewTeamClubId("");
		} catch (err) {
			toast.error("No se pudo crear el equipo", getApiErrorMessage(err));
		}
	};

	const onCreateInvitation = async () => {
		try {
			const result = await createInvitation.mutateAsync({
				stageId,
				maxUses: null,
			});
			const baseUrl = window.location.origin;
			const link = `${baseUrl}/invite/${result.token}`;
			setInviteLink(link);
			toast.success("Link de invitación creado");
		} catch (err) {
			toast.error("No se pudo crear la invitación", getApiErrorMessage(err));
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
			<AdminFlowSteps current="group" />
			<Card className="p-4">
				<h3 className="font-bold">Invitar equipos</h3>
				<p className="mt-1 text-sm text-(--sea-ink-soft)">
					Genera un link para que los capitanes inscriban sus equipos
					directamente. Puedes compartirlo o generar un código QR.
				</p>
				<div className="mt-3 flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setInviteLink(null);
							setShowInviteDialog(true);
						}}
					>
						Crear link de invitación
					</Button>
				</div>
			</Card>

			{editionId && currentStage && (
				<Card className="p-4">
					<h3 className="font-bold">Avance a la etapa siguiente</h3>
					{isSource && (
						<>
							<p className="mt-1 text-sm text-(--sea-ink-soft)">
								Cuántos equipos por grupo pasan a la etapa siguiente
								{nextStage
									? ` («${nextStage.name}»)`
									: " (sin etapa siguiente)"}
								.
							</p>
							<form
								onSubmit={onSaveAdvancement}
								className="mt-3 flex flex-wrap items-end gap-3"
							>
								<Field
									label="Clasifican por grupo"
									htmlFor="adv-qualify"
									className="w-32"
								>
									<Input
										id="adv-qualify"
										type="number"
										min={1}
										value={qualifyPerGroup}
										onChange={(e) => setQualifyPerGroup(e.target.value)}
										placeholder="2"
									/>
								</Field>
								<Field label="Cruce" htmlFor="adv-seeding" className="w-40">
									<Select
										id="adv-seeding"
										value={seeding}
										onChange={(e) => setSeeding(e.target.value)}
									>
										<option value="cross">Cruzado (A1 vs B2)</option>
										<option value="linear">Lineal (A1 vs B1)</option>
									</Select>
								</Field>
								<Button
									type="submit"
									icon={Save}
									disabled={updateStage.isPending}
								>
									{updateStage.isPending ? "Guardando…" : "Guardar regla"}
								</Button>
								{qualifiersRule?.qualifyPerGroup && (
									<Button
										type="button"
										variant="outline"
										icon={Plus}
										disabled={advanceStage.isPending}
										onClick={onAdvance}
									>
										{advanceStage.isPending ? "Aplicando…" : "Aplicar avance"}
									</Button>
								)}
							</form>
							{qualifiers.length > 0 && (
								<div className="mt-3 flex flex-col gap-1">
									{qualifiers.map((q) => (
										<div
											key={`${q.groupId}-${q.team.id}`}
											className="flex items-center justify-between text-sm"
										>
											<span>
												{q.team.name}{" "}
												<span className="text-(--sea-ink-soft)">
													({q.groupName} · pos. {q.position})
												</span>
											</span>
											{q.qualified ? (
												<Badge variant="success">clasifica</Badge>
											) : (
												<Badge variant="outline">no</Badge>
											)}
										</div>
									))}
								</div>
							)}
						</>
					)}
					{isTarget && (
						<div className="mt-3">
							<p className="mb-2 text-sm text-(--sea-ink-soft)">
								Genera la llave a partir de los clasificados de la etapa
								anterior (o de los inscritos de esta etapa).
							</p>
							<Button
								variant="outline"
								icon={Plus}
								disabled={generateBracket.isPending}
								onClick={() => onGenerateBracket(false)}
							>
								{generateBracket.isPending ? "Generando…" : "Generar llaves"}
							</Button>
						</div>
					)}
				</Card>
			)}

			<div className="grid gap-6 lg:grid-cols-2">
				<Card className="p-4">
					<h3 className="font-bold">Grupos</h3>
					<p className="mt-1 text-sm text-(--sea-ink-soft)">
						El grupo es la unidad de la tabla y los cruces (Grupo A, Grupo B…).
					</p>
					<form onSubmit={onCreateGroup} className="mt-2 flex flex-wrap gap-3">
						<Field
							label="Nombre del grupo"
							htmlFor="group-name"
							className="min-w-40 flex-1"
						>
							<Input
								id="group-name"
								value={groupName}
								onChange={(e) => setGroupName(e.target.value)}
								placeholder="Grupo A"
								required
							/>
						</Field>
						<Button
							type="submit"
							icon={Plus}
							className="self-end"
							disabled={createGroup.isPending}
						>
							Crear
						</Button>
					</form>
					{groupsPending ? (
						<div className="mt-3 flex flex-col gap-2">
							<Skeleton className="h-10 rounded-xl" />
							<Skeleton className="h-10 rounded-xl" />
						</div>
					) : groups.length === 0 ? (
						<EmptyState
							icon={Table2}
							title="Sin grupos todavía"
							description="Los grupos son opcionales. Crea uno solo si tu etapa necesita fase de grupos o tablas separadas."
							className="mt-3"
						/>
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
											size="icon-sm"
											icon={Pencil}
											aria-label="Editar"
											title="Editar"
											onClick={() => setEditingGroup(g)}
										/>
										<Button
											variant="destructive"
											size="icon-sm"
											icon={Trash2}
											aria-label="Eliminar"
											title="Eliminar"
											onClick={() => onDeleteGroup(g.id, g.name)}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</Card>

				<Card className="p-4">
					<h3 className="font-bold">Equipos</h3>
					<p className="mt-1 text-sm text-(--sea-ink-soft)">
						Inscribe los equipos de la etapa. Asignarlos a un grupo es opcional
						solo si la etapa usa grupos.
					</p>
					<form onSubmit={onRegister} className="mt-2 flex gap-2">
						<Select
							value={teamId}
							onChange={(e) => setTeamId(e.target.value)}
							aria-label="Equipo"
							className="flex-1"
						>
							{teams.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</Select>
						<Button type="submit" icon={Plus} disabled={registerTeam.isPending}>
							Inscribir
						</Button>
					</form>
					<div className="mt-2">
						<Button
							variant="ghost"
							size="sm"
							icon={Plus}
							onClick={() => setShowCreateTeam(true)}
						>
							Crear equipo nuevo
						</Button>
					</div>
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
								icon={Users}
								title="Sin inscripciones"
								description="Inscribe el primer equipo con el formulario de arriba. Sin equipos inscritos no hay partidos. El grupo es opcional."
							/>
						)}
					</div>
				</Card>
			</div>

			<Card className="p-4">
				<h3 className="font-bold">Fixture rápido</h3>
				<p className="mt-1 max-w-2xl text-sm text-(--sea-ink-soft)">
					Crea un partido entre dos equipos ya inscritos en la etapa. Si la
					etapa tiene grupos, los equipos deben pertenecer al mismo grupo.
				</p>
				{registrations.length < 2 ? (
					<div className="mt-3 rounded-xl border border-(--line) bg-(--chip-bg) p-3 text-sm text-(--sea-ink-soft)">
						Necesitas al menos 2 equipos inscritos para crear un partido.
						Inscribe equipos desde la sección de arriba.
					</div>
				) : tournamentId ? (
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
			{showCreateTeam && (
				<CreateTeamDialog
					clubs={
						(clubsData as { items: Array<{ id: string; name: string }> })
							?.items ?? []
					}
					newTeamName={newTeamName}
					setNewTeamName={setNewTeamName}
					newTeamClubId={newTeamClubId}
					setNewTeamClubId={setNewTeamClubId}
					onClose={() => setShowCreateTeam(false)}
					onSubmit={onCreateTeam}
					isPending={createTeam.isPending}
				/>
			)}
			{showInviteDialog && (
				<InviteDialog
					inviteLink={inviteLink}
					onClose={() => setShowInviteDialog(false)}
					onCreate={onCreateInvitation}
					isPending={createInvitation.isPending}
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
					<Button
						size="sm"
						icon={Save}
						onClick={onSubmit}
						disabled={updateGroup.isPending}
					>
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

function CreateTeamDialog({
	clubs,
	newTeamName,
	setNewTeamName,
	newTeamClubId,
	setNewTeamClubId,
	onClose,
	onSubmit,
	isPending,
}: {
	clubs: Array<{ id: string; name: string }>;
	newTeamName: string;
	setNewTeamName: (v: string) => void;
	newTeamClubId: string;
	setNewTeamClubId: (v: string) => void;
	onClose: () => void;
	onSubmit: (e: React.SyntheticEvent) => void;
	isPending: boolean;
}) {
	const [showCreateClub, setShowCreateClub] = React.useState(false);
	const [newClubName, setNewClubName] = React.useState("");
	const createClubHook = useCreateClub(api);

	const onCreateClub = async () => {
		if (!newClubName.trim()) return;
		try {
			const club = (await createClubHook.mutateAsync({
				name: newClubName.trim(),
			})) as {
				id: string;
			};
			setNewTeamClubId(club.id);
			setShowCreateClub(false);
			setNewClubName("");
			toast.success("Club creado");
		} catch (err) {
			toast.error("No se pudo crear el club", getApiErrorMessage(err));
		}
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title="Crear equipo"
			description="El equipo se inscribirá automáticamente en esta etapa."
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancelar
					</Button>
					<Button size="sm" icon={Save} onClick={onSubmit} disabled={isPending}>
						Crear e inscribir
					</Button>
				</>
			}
		>
			<form onSubmit={onSubmit} className="space-y-3">
				<Field label="Nombre del equipo" htmlFor="new-team-name">
					<Input
						id="new-team-name"
						value={newTeamName}
						onChange={(e) => setNewTeamName(e.target.value)}
						placeholder="Ej: Tigres UANL"
						required
					/>
				</Field>
				{showCreateClub ? (
					<div className="space-y-2 rounded-xl border border-(--line) p-3">
						<p className="text-sm font-semibold">Crear club nuevo</p>
						<Field label="Nombre del club" htmlFor="new-club-name">
							<Input
								id="new-club-name"
								value={newClubName}
								onChange={(e) => setNewClubName(e.target.value)}
								placeholder="Ej: Club Deportivo Tigres"
								required
							/>
						</Field>
						<div className="flex gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									setShowCreateClub(false);
									setNewClubName("");
								}}
							>
								Cancelar
							</Button>
							<Button
								type="button"
								size="sm"
								disabled={!newClubName.trim() || createClubHook.isPending}
								onClick={onCreateClub}
							>
								Crear club
							</Button>
						</div>
					</div>
				) : (
					<Field label="Club (opcional)" htmlFor="new-team-club">
						<div className="flex gap-2">
							<Select
								id="new-team-club"
								value={newTeamClubId}
								onChange={(e) => setNewTeamClubId(e.target.value)}
								className="flex-1"
							>
								<option value="">Sin club</option>
								{clubs.map((c) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</Select>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setShowCreateClub(true)}
								className="shrink-0"
							>
								Crear club
							</Button>
						</div>
					</Field>
				)}
			</form>
		</EditDialog>
	);
}

function InviteDialog({
	inviteLink,
	onClose,
	onCreate,
	isPending,
}: {
	inviteLink: string | null;
	onClose: () => void;
	onCreate: () => void;
	isPending: boolean;
}) {
	const [copied, setCopied] = React.useState(false);

	const copyToClipboard = async () => {
		if (!inviteLink) return;
		await navigator.clipboard.writeText(inviteLink);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<EditDialog
			open
			onClose={onClose}
			title="Invitar equipos"
			description="Comparte este link con los capitanes para que inscriban sus equipos."
			footer={
				<>
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cerrar
					</Button>
					{!inviteLink && (
						<Button
							size="sm"
							icon={Save}
							onClick={onCreate}
							disabled={isPending}
						>
							{isPending ? "Creando..." : "Crear link"}
						</Button>
					)}
				</>
			}
		>
			{inviteLink ? (
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Input
							value={inviteLink}
							readOnly
							className="flex-1 font-mono text-xs"
						/>
						<Button
							variant="outline"
							size="sm"
							onClick={copyToClipboard}
							className="shrink-0"
						>
							{copied ? "Copiado" : "Copiar"}
						</Button>
					</div>
					<div className="flex justify-center">
						<div className="rounded-xl border border-(--line) bg-white p-4">
							<QRCodeSVG
								value={inviteLink}
								size={180}
								level="M"
								includeMargin
							/>
						</div>
					</div>
					<p className="text-center text-xs text-(--sea-ink-soft)">
						Este link es de un solo uso y expira en 7 días. Los capitanes podrán
						crear un equipo nuevo o inscribir uno existente.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					<p className="text-sm text-(--sea-ink-soft)">
						Al crear el link, se generará un código QR que puedes compartir con
						los capitanes de equipo.
					</p>
				</div>
			)}
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
		<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-3">
			<Field label="Local" htmlFor="match-home" className="min-w-40 flex-1">
				<Select
					id="match-home"
					value={homeTeamId}
					onChange={(e) => setHomeTeamId(e.target.value)}
				>
					{teams.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</Select>
			</Field>
			<span className="self-end pb-3 text-center text-xs font-bold text-(--sea-ink-soft)">
				vs
			</span>
			<Field label="Visitante" htmlFor="match-away" className="min-w-40 flex-1">
				<Select
					id="match-away"
					value={awayTeamId}
					onChange={(e) => setAwayTeamId(e.target.value)}
				>
					{teams.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</Select>
			</Field>
			<Field label="Grupo" htmlFor="match-group" className="w-40">
				<Select
					id="match-group"
					value={groupId}
					onChange={(e) => setGroupId(e.target.value)}
				>
					<option value="">Sin grupo</option>
					{groups.map((g) => (
						<option key={g.id} value={g.id}>
							{g.name}
						</option>
					))}
				</Select>
			</Field>
			<Button
				type="submit"
				icon={Plus}
				className="self-end"
				disabled={createMatch.isPending}
			>
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
			<Field label="Equipo" htmlFor="roster-team">
				<Select
					id="roster-team"
					value={selectedTeamId}
					onChange={(e) => setSelectedTeamId(e.target.value)}
				>
					{teams.map((t) => (
						<option key={t.id} value={t.id}>
							{t.name}
						</option>
					))}
				</Select>
			</Field>
			{players.length === 0 ? (
				<p className="text-sm text-(--sea-ink-soft)">
					No hay jugadores en el catálogo todavía. Créalos en{" "}
					<Link to="/admin/players" className="font-semibold">
						Jugadores
					</Link>{" "}
					para armar el plantel.
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
							{players.map((p) => (
								<option key={p.id} value={p.id}>
									{p.firstName} {p.lastName}
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
			<div className="space-y-1">
				{roster.length === 0 ? (
					<EmptyState
						icon={Users}
						title="Plantel vacío"
						description={
							players.length === 0
								? "Cuando haya jugadores en el catálogo podrás añadirlos a este equipo."
								: "Añade jugadores al plantel con el formulario de arriba."
						}
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
										size="icon-sm"
										icon={Pencil}
										aria-label="Editar"
										title="Editar"
										onClick={() => setEditingEntry({ roster: r, player })}
									/>
									<Button
										variant="destructive"
										size="sm"
										icon={Trash2}
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

import { getApiErrorMessage } from "@sports/api-client";
import {
	useAdvanceStage,
	useAutoCreateGroups,
	useClubs,
	useCreateClub,
	useCreateGroup,
	useCreateInvitation,
	useCreateTeam,
	useDeleteGroup,
	useGenerateBracket,
	useGroupsByStage,
	useRegisterTeam,
	useRegistrationsByStage,
	useStageQualifiers,
	useStagesByEdition,
	useTeams,
	useUnregisterTeam,
	useUpdateGroup,
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
	Plus,
	Save,
	Select,
	Skeleton,
	Sparkles,
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
import { StageFixture } from "../../../components/StageFixture";
import {
	type BoardGroup,
	StageGroupsBoard,
} from "../../../components/StageGroupsBoard";
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
								position: number | null;
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
	const registeredTeamIds = new Set(registrations.map((item) => item.team.id));
	const availableTeams = teams.filter(
		(team) => !registeredTeamIds.has(team.id),
	);
	const groupNameById = new Map(groups.map((group) => [group.id, group.name]));
	const unassignedCount = registrations.filter(
		(item) => item.registration.groupId === null,
	).length;

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
	// El avance solo existe cuando hay a dónde avanzar y equipos repartidos en
	// grupos (los clasificados se calculan de la tabla de cada grupo).
	const hasGroupedTeams = registrations.some(
		(item) => item.registration.groupId !== null,
	);
	const canAdvance =
		!!currentStage && !!nextStage && groups.length > 0 && hasGroupedTeams;
	// La llave sí es de la propia etapa: no depende de la siguiente.
	const canGenerateBracket = currentStage?.stageType === "single_elimination";
	const showAdvanceSection = canAdvance || canGenerateBracket;

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
	const [numGroups, setNumGroups] = React.useState(2);
	const autoCreateGroups = useAutoCreateGroups(api);
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
		if (availableTeams.length && !availableTeams.some((t) => t.id === teamId)) {
			setTeamId(availableTeams[0]!.id);
		}
	}, [availableTeams, teamId]);

	// Sugerencia de reparto: grupos de ~4 equipos, sin bajar de 2 ni pasar de 26.
	React.useEffect(() => {
		if (registrations.length >= 2) {
			setNumGroups(
				Math.max(2, Math.min(26, Math.round(registrations.length / 4))),
			);
		}
	}, [registrations.length]);

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

	const onAutoCreateGroups = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await autoCreateGroups.mutateAsync({ stageId, numGroups });
			toast.success("Grupos creados y equipos repartidos");
		} catch (err) {
			toast.error("No se pudieron crear los grupos", getApiErrorMessage(err));
		}
	};

	const onDistributeUnassigned = async () => {
		try {
			await autoCreateGroups.mutateAsync({ stageId });
			toast.success("Equipos repartidos entre los grupos");
		} catch (err) {
			toast.error(
				"No se pudieron repartir los equipos",
				getApiErrorMessage(err),
			);
		}
	};

	const onRegister = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		if (!teamId) {
			toast.error("Elige un equipo para inscribir");
			return;
		}
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

			<Card className="p-4">
				<h3 className="font-bold">Equipos</h3>
				<p className="mt-1 text-sm text-(--sea-ink-soft)">
					Inscribe los equipos de la etapa. El grupo se asigna en la sección
					Grupos, arrastrando el equipo a su tabla.
				</p>
				<form onSubmit={onRegister} className="mt-2 flex gap-2">
					<Select
						value={teamId}
						onChange={(e) => setTeamId(e.target.value)}
						aria-label="Equipo"
						className="flex-1"
						disabled={availableTeams.length === 0}
					>
						{availableTeams.length === 0 ? (
							<option value="">
								Todos los equipos del catálogo ya están inscritos
							</option>
						) : (
							availableTeams.map((t) => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))
						)}
					</Select>
					<Button
						type="submit"
						icon={Plus}
						disabled={registerTeam.isPending || availableTeams.length === 0}
					>
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
							groupName={
								registration.groupId
									? (groupNameById.get(registration.groupId) ?? null)
									: null
							}
							editionId={editionId}
						/>
					))}
					{registrations.length === 0 && (
						<EmptyState
							icon={Users}
							title="Sin inscripciones"
							description="Inscribe el primer equipo con el formulario de arriba. Sin equipos inscritos no hay partidos."
						/>
					)}
				</div>
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Grupos</h3>
				<p className="mt-1 text-sm text-(--sea-ink-soft)">
					El grupo es la unidad de la tabla y los cruces (Grupo A, Grupo B…).
					Crea los grupos a mano o deja que la app los arme al azar; después
					arrastra los equipos para moverlos.
				</p>
				<div className="mt-3 grid gap-3 lg:grid-cols-2">
					<form
						onSubmit={onCreateGroup}
						className="flex flex-wrap items-end gap-2"
					>
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
						<Button type="submit" icon={Plus} disabled={createGroup.isPending}>
							Crear
						</Button>
					</form>
					<div className="rounded-xl border border-(--chip-line) bg-(--chip-bg) p-3">
						{groups.length === 0 ? (
							<>
								<p className="text-xs text-(--sea-ink-soft)">
									Crea los grupos y reparte al azar a los equipos inscritos.
								</p>
								<form
									onSubmit={onAutoCreateGroups}
									className="mt-2 flex flex-wrap items-end gap-2"
								>
									<Field
										label="Número de grupos"
										htmlFor="auto-groups"
										className="w-36"
									>
										<Input
											id="auto-groups"
											type="number"
											min={2}
											max={Math.min(26, Math.max(2, registrations.length))}
											value={numGroups}
											onChange={(e) => setNumGroups(Number(e.target.value))}
											required
										/>
									</Field>
									<Button
										type="submit"
										variant="outline"
										icon={Sparkles}
										disabled={
											autoCreateGroups.isPending || registrations.length < 2
										}
									>
										{autoCreateGroups.isPending
											? "Creando…"
											: "Crear y repartir"}
									</Button>
								</form>
								{registrations.length < 2 && (
									<p className="mt-2 text-xs text-(--sea-ink-soft)">
										Necesitas al menos 2 equipos inscritos para repartir.
									</p>
								)}
							</>
						) : (
							<>
								<p className="text-xs text-(--sea-ink-soft)">
									La app solo reparte equipos sin grupo; nunca mueve lo que
									asignaste a mano.
								</p>
								{unassignedCount > 0 ? (
									<Button
										type="button"
										variant="outline"
										size="sm"
										icon={Sparkles}
										className="mt-2"
										onClick={onDistributeUnassigned}
										disabled={autoCreateGroups.isPending}
									>
										{autoCreateGroups.isPending
											? "Repartiendo…"
											: `Repartir ${unassignedCount} sin grupo`}
									</Button>
								) : (
									<p className="mt-2 text-xs text-(--sea-ink-soft)">
										Todos los equipos tienen grupo.
									</p>
								)}
							</>
						)}
					</div>
				</div>
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
					<div className="mt-3">
						<StageGroupsBoard
							groups={groups}
							registrations={registrations}
							onEditGroup={(group: BoardGroup) => setEditingGroup(group)}
							onDeleteGroup={(group: BoardGroup) =>
								onDeleteGroup(group.id, group.name)
							}
						/>
					</div>
				)}
			</Card>

			{showAdvanceSection && currentStage && (
				<Card className="p-4">
					<h3 className="font-bold">Avance a la etapa siguiente</h3>
					{canAdvance && nextStage && (
						<>
							<p className="mt-1 text-sm text-(--sea-ink-soft)">
								Cuántos equipos por grupo pasan a «{nextStage.name}».
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
					{canGenerateBracket && (
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

			<StageFixture
				stageId={stageId}
				tournamentId={tournamentId}
				stageType={currentStage?.stageType}
				groups={groups}
				registrations={registrations}
			/>

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
	groupName,
	editionId,
}: {
	registration: { id: string; teamId: string; groupId: string | null };
	team: { id: string; name: string };
	groupName: string | null;
	editionId: string | null;
}) {
	const unregister = useUnregisterTeam(api);
	const confirm = useConfirm();
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
			<span className="flex flex-wrap items-center gap-2">
				{team.name}
				{groupName ? (
					<Badge variant="secondary">{groupName}</Badge>
				) : (
					<Badge variant="outline">sin grupo</Badge>
				)}
			</span>
			<div className="flex items-center gap-2">
				<Link
					to="/admin/teams/$teamId"
					params={{ teamId: team.id }}
					search={editionId ? { editionId } : {}}
					className="no-underline"
				>
					<Button variant="outline" size="sm">
						Gestionar plantilla
					</Button>
				</Link>
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

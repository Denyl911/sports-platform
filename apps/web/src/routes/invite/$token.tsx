import { getApiErrorMessage } from "@sports/api-client";
import {
	useInvitationInfo,
	useRegisterWithInvitation,
	useTeams,
	useClubs,
} from "@sports/api-client/hooks";
import {
	Button,
	Card,
	Field,
	Input,
	Select,
	Skeleton,
	toast,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/invite/$token")({
	head: () => ({
		meta: [
			{ title: "Inscripción de equipo — Sports Platform" },
			{
				name: "description",
				content: "Inscribe tu equipo en el torneo usando un link de invitación.",
			},
		],
	}),
	component: InvitePage,
});

function InvitePage() {
	const { token } = Route.useParams();
	const { data: info, isPending, error } = useInvitationInfo(token);
	const { data: teamsData } = useTeams(api);
	const { data: clubsData } = useClubs(api);
	const register = useRegisterWithInvitation(api);

	const [mode, setMode] = React.useState<"existing" | "new">("existing");
	const [selectedTeamId, setSelectedTeamId] = React.useState("");
	const [newTeamName, setNewTeamName] = React.useState("");
	const [newTeamClubId, setNewTeamClubId] = React.useState("");

	const teams =
		(teamsData as { items: Array<{ id: string; name: string }> })?.items ??
		[];
	const clubs =
		(clubsData as { items: Array<{ id: string; name: string }> })?.items ??
		[];

	React.useEffect(() => {
		if (teams.length && !selectedTeamId) setSelectedTeamId(teams[0]!.id);
	}, [teams, selectedTeamId]);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			if (mode === "existing") {
				await register.mutateAsync({
					token,
					body: { teamId: selectedTeamId },
				});
			} else {
				await register.mutateAsync({
					token,
					body: {
						newTeam: {
							name: newTeamName,
							clubId: newTeamClubId || undefined,
						},
					},
				});
			}
			toast.success("Equipo inscrito exitosamente");
		} catch (err) {
			toast.error("No se pudo inscribir el equipo", getApiErrorMessage(err));
		}
	};

	if (isPending) {
		return (
			<main className="page-wrap flex min-h-screen items-center justify-center px-4">
				<div className="w-full max-w-md space-y-4">
					<Skeleton className="h-8 w-3/4" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
			</main>
		);
	}

	if (error || !info) {
		return (
			<main className="page-wrap flex min-h-screen items-center justify-center px-4">
				<Card className="w-full max-w-md p-6 text-center">
					<h1 className="text-xl font-bold text-(--sea-ink)">
						Link inválido o expirado
					</h1>
					<p className="mt-2 text-sm text-(--sea-ink-soft)">
						Este link de inscripción no es válido o ha expirado. Contacta al
						organizador del torneo para obtener un nuevo link.
					</p>
					<Link
						to="/"
						className="mt-4 inline-block text-sm font-semibold text-(--sea-ink) no-underline hover:underline"
					>
						Ir al inicio
					</Link>
				</Card>
			</main>
		);
	}

	return (
		<main className="page-wrap flex min-h-screen items-center justify-center px-4 py-12">
			<div className="w-full max-w-lg space-y-6">
				<div className="text-center">
					<p className="island-kicker mb-2">Inscripción de equipo</p>
					<h1 className="display-title text-3xl font-bold text-(--sea-ink)">
						{info.tournamentName}
					</h1>
					<p className="mt-1 text-sm text-(--sea-ink-soft)">
						{info.editionName} — {info.stageName}
					</p>
				</div>

				<Card className="p-6">
					<form onSubmit={onSubmit} className="space-y-4">
						<div className="flex gap-2">
							<Button
								type="button"
								variant={mode === "existing" ? "default" : "ghost"}
								size="sm"
								onClick={() => setMode("existing")}
								className="flex-1"
							>
								Equipo existente
							</Button>
							<Button
								type="button"
								variant={mode === "new" ? "default" : "ghost"}
								size="sm"
								onClick={() => setMode("new")}
								className="flex-1"
							>
								Crear equipo nuevo
							</Button>
						</div>

						{mode === "existing" ? (
							<Field label="Equipo" htmlFor="team-select">
								<Select
									id="team-select"
									value={selectedTeamId}
									onChange={(e) => setSelectedTeamId(e.target.value)}
									required
								>
									{teams.map((t) => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</Select>
							</Field>
						) : (
							<>
								<Field label="Nombre del equipo" htmlFor="new-team-name">
									<Input
										id="new-team-name"
										value={newTeamName}
										onChange={(e) => setNewTeamName(e.target.value)}
										placeholder="Ej: Tigres UANL"
										required
									/>
								</Field>
								<Field label="Club (opcional)" htmlFor="new-team-club">
									<Select
										id="new-team-club"
										value={newTeamClubId}
										onChange={(e) => setNewTeamClubId(e.target.value)}
									>
										<option value="">Sin club</option>
										{clubs.map((c) => (
											<option key={c.id} value={c.id}>
												{c.name}
											</option>
										))}
									</Select>
								</Field>
							</>
						)}

						<Button
							type="submit"
							className="w-full"
							disabled={register.isPending}
						>
							{register.isPending ? "Inscribiendo..." : "Inscribir equipo"}
						</Button>
					</form>
				</Card>

				<p className="text-center text-xs text-(--sea-ink-soft)">
					Al inscribir tu equipo, aceptas las reglas del torneo. El
					organizador revisará tu inscripción.
				</p>
			</div>
		</main>
	);
}

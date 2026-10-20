import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import { useUpdateTeam } from "@sports/api-client/hooks";
import {
	Button,
	Card,
	CardHeader,
	CardTitle,
	EmptyState,
	Input,
	Label,
	Save,
	Skeleton,
	toast,
	Users,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AdminBreadcrumbs } from "../../../components/AdminBreadcrumbs";
import { api } from "../../../lib/api";
import CategoryField from "../../../components/CategoryField";

export const Route = createFileRoute("/admin/teams/$teamId")({
	component: AdminTeamDetailPage,
});

function AdminTeamDetailPage() {
	const { teamId } = Route.useParams();
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
		</div>
	);
}

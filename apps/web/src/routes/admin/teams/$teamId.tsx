// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { queryKeys, getApiErrorMessage } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { useUpdateTeam } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label, Select } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/teams/$teamId")({
	component: AdminTeamDetailPage,
});

function AdminTeamDetailPage() {
	const { teamId } = Route.useParams();
	const { data } = useQuery({ queryKey: queryKeys.teams.detail(teamId), queryFn: () => unwrap(api.teams({ id: teamId }).get()) });
	const team = data as { id: string; name: string; clubId: string; category?: string | null } | undefined;
	const update = useUpdateTeam(api);
	const [name, setName] = React.useState("");
	const [category, setCategory] = React.useState("open");
	const [error, setError] = React.useState<string | null>(null);
	React.useEffect(() => { if (team) { setName(team.name); setCategory(team.category ?? "open"); } }, [team]);
	if (!team) return <div className="demo-center text-sm">Cargando equipo…</div>;
	const onUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try { await update.mutateAsync({ id: teamId, body: { name, category } as never }); } catch (err) { setError(getApiErrorMessage(err)); }
	};
	return (
		<div className="space-y-6">
			<Link to="/admin/teams" className="text-sm text-[var(--sea-ink-soft)]">← Equipos</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2"><CardTitle>Editar equipo</CardTitle></CardHeader>
				<form onSubmit={onUpdate} className="space-y-3">
					<div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
					<div><Label>Categoría</Label><Select value={category} onChange={(e) => setCategory(e.target.value)}><option value="open">open</option><option value="u18">u18</option><option value="senior">senior</option></Select></div>
					<Button type="submit" disabled={update.isPending}>Guardar</Button>
					{error && <div className="demo-alert-danger text-sm">{error}</div>}
					{update.isSuccess && <div className="demo-alert text-sm">Guardado</div>}
				</form>
			</Card>
		</div>
	);
}

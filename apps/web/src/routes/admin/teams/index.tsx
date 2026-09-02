// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../../lib/api";
import { getApiErrorMessage } from "@sports/api-client";
import { useTeams, useCreateTeam, useDeleteTeam, useClubs } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label, Select, Badge } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/teams/")({
	component: AdminTeamsPage,
});

function AdminTeamsPage() {
	const { data: teamsData } = useTeams(api);
	const { data: clubsData } = useClubs(api);
	const create = useCreateTeam(api);
	const del = useDeleteTeam(api);
	const teams = (teamsData as { items: Array<{ id: string; name: string; clubId: string; category?: string | null }>; total: number } | undefined)?.items ?? [];
	const clubs = (clubsData as { items: Array<{ id: string; name: string }>; total: number } | undefined)?.items ?? [];
	const [name, setName] = React.useState("");
	const [clubId, setClubId] = React.useState("");
	const [category, setCategory] = React.useState("open");
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => { if (clubs.length && !clubId) setClubId(clubs[0]!.id); }, [clubs, clubId]);

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try { await create.mutateAsync({ name, clubId, category } as never); setName(""); } catch (err) { setError(getApiErrorMessage(err)); }
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Equipos</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear equipo</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Equipo A" required className="flex-1 min-w-40" />
					<Select value={clubId} onChange={(e) => setClubId(e.target.value)} className="w-40">
						{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
					</Select>
					<Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-32">
						<option value="open">open</option>
						<option value="u18">u18</option>
						<option value="senior">senior</option>
					</Select>
					<Button type="submit" disabled={create.isPending}>Crear</Button>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
			</Card>
			<div className="grid gap-3 sm:grid-cols-2">
				{teams.map((t) => (
					<Card key={t.id} className="p-4 flex flex-col">
						<Link to="/admin/teams/$teamId" params={{ teamId: t.id }} className="no-underline">
							<CardHeader className="p-0"><CardTitle className="text-base">{t.name}</CardTitle></CardHeader>
							<Badge variant="outline">{t.category ?? "open"}</Badge>
						</Link>
						<Button variant="ghost" size="sm" className="mt-2 self-start" onClick={async () => {
							if (!confirm(`¿Eliminar equipo ${t.name}?`)) return;
							try { await del.mutateAsync(t.id); } catch (err) { setError(getApiErrorMessage(err)); }
						}}>Eliminar</Button>
					</Card>
				))}
			</div>
			{teams.length === 0 && <div className="demo-card text-center text-sm">No hay equipos</div>}
		</div>
	);
}

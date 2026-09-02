// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../../lib/api";
import { getApiErrorMessage } from "@sports/api-client";
import { useClubs, useCreateClub, useDeleteClub } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/clubs/")({
	component: AdminClubsPage,
});

function AdminClubsPage() {
	const { data: clubsData } = useClubs(api);
	const create = useCreateClub(api);
	const del = useDeleteClub(api);
	const clubs = (clubsData as { items: Array<{ id: string; name: string }>; total: number } | undefined)?.items ?? [];
	const [name, setName] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await create.mutateAsync({ name } as never);
			setName("");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Clubes</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear club</h3>
				<form onSubmit={onCreate} className="mt-2 flex gap-2">
					<Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Club Atlético" required className="flex-1" />
					<Button type="submit" disabled={create.isPending}>Crear</Button>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
			</Card>
			<div className="grid gap-3 sm:grid-cols-2">
				{clubs.map((c) => (
					<Card key={c.id} className="p-4 flex flex-col">
						<Link to="/admin/clubs/$clubId" params={{ clubId: c.id }} className="no-underline">
							<CardHeader className="p-0"><CardTitle className="text-base">{c.name}</CardTitle></CardHeader>
						</Link>
						<Button variant="ghost" size="sm" className="mt-2 self-start" onClick={async () => {
							if (!confirm(`¿Eliminar club ${c.name}?`)) return;
							try { await del.mutateAsync(c.id); } catch (err) { setError(getApiErrorMessage(err)); }
						}}>Eliminar</Button>
					</Card>
				))}
			</div>
			{clubs.length === 0 && <div className="demo-card text-center text-sm">No hay clubes</div>}
		</div>
	);
}

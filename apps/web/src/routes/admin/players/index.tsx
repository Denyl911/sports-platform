// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../../lib/api";
import { getApiErrorMessage } from "@sports/api-client";
import { usePlayers, useCreatePlayer, useDeletePlayer } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/players/")({
	component: AdminPlayersPage,
});

function AdminPlayersPage() {
	const { data: playersData } = usePlayers(api);
	const create = useCreatePlayer(api);
	const del = useDeletePlayer(api);
	const players = (playersData as { items: Array<{ id: string; firstName: string; lastName: string; idCardNumber?: string | null }>; total: number } | undefined)?.items ?? [];
	const [firstName, setFirstName] = React.useState("");
	const [lastName, setLastName] = React.useState("");
	const [idCardNumber, setIdCardNumber] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try { await create.mutateAsync({ firstName, lastName, idCardNumber: idCardNumber || null } as never); setFirstName(""); setLastName(""); setIdCardNumber(""); } catch (err) { setError(getApiErrorMessage(err)); }
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Jugadores</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear jugador</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Nombre" required className="flex-1 min-w-32" />
					<Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Apellido" required className="flex-1 min-w-32" />
					<Input value={idCardNumber} onChange={(e) => setIdCardNumber(e.target.value)} placeholder="DNI (opcional)" className="flex-1 min-w-32" />
					<Button type="submit" disabled={create.isPending}>Crear</Button>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
			</Card>
			<div className="grid gap-3 sm:grid-cols-2">
				{players.map((p) => (
					<Card key={p.id} className="p-4 flex flex-col">
						<Link to="/admin/players/$playerId" params={{ playerId: p.id }} className="no-underline">
							<CardHeader className="p-0"><CardTitle className="text-base">{p.firstName} {p.lastName}</CardTitle></CardHeader>
							<div className="text-xs text-[var(--sea-ink-soft)]">{p.idCardNumber ?? "—"}</div>
						</Link>
						<Button variant="ghost" size="sm" className="mt-2 self-start" onClick={async () => {
							if (!confirm(`¿Eliminar jugador ${p.firstName} ${p.lastName}?`)) return;
							try { await del.mutateAsync(p.id); } catch (err) { setError(getApiErrorMessage(err)); }
						}}>Eliminar</Button>
					</Card>
				))}
			</div>
			{players.length === 0 && <div className="demo-card text-center text-sm">No hay jugadores</div>}
		</div>
	);
}

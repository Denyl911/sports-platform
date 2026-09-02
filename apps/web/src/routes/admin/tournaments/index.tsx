// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { queryKeys, getApiErrorMessage } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { useCreateTournament, useDeleteTournament, useSports } from "@sports/api-client/hooks";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, Badge } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/tournaments/")({
	component: AdminTournamentsPage,
});

function AdminTournamentsPage() {
	const { data: tournamentsData, isPending } = useQuery({
		queryKey: queryKeys.tournaments.list(),
		queryFn: () => unwrap(api.tournaments.get({ query: {} as never })),
	});
	const { data: sportsData } = useSports(api);
	const create = useCreateTournament(api);
	const del = useDeleteTournament(api);

	const [name, setName] = React.useState("");
	const [sportId, setSportId] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const tournaments = (tournamentsData as { items: Array<{ id: string; name: string; sportId: string }>; total: number } | undefined)?.items ?? [];
	const sports = (sportsData as { items: Array<{ id: string; name: string }>; total: number } | undefined)?.items ?? [];

	React.useEffect(() => {
		if (sports.length && !sportId) setSportId(sports[0]!.id);
	}, [sports, sportId]);

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await create.mutateAsync({ name, sportId } as never);
			setName("");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="demo-title">Torneos</h1>
				<Badge variant="secondary">{tournaments.length} total</Badge>
			</div>

			<Card className="p-4">
				<h3 className="mb-3 font-bold">Crear torneo</h3>
				<form onSubmit={onCreate} className="flex flex-wrap gap-3">
					<div className="min-w-48 flex-1">
						<Label htmlFor="t-name">Nombre</Label>
						<Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Copa Apertura" />
					</div>
					<div className="w-48">
						<Label htmlFor="t-sport">Deporte</Label>
						<Select id="t-sport" value={sportId} onChange={(e) => setSportId(e.target.value)}>
							{sports.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} ({s.id})
								</option>
							))}
						</Select>
					</div>
					<div className="flex items-end">
						<Button type="submit" disabled={create.isPending || !name || !sportId}>
							{create.isPending ? "Creando…" : "Crear"}
						</Button>
					</div>
				</form>
				{error && <div className="demo-alert-danger mt-3 text-sm">{error}</div>}
				{create.isSuccess && <div className="demo-alert mt-3 text-sm">Torneo creado</div>}
			</Card>

			{isPending ? (
				<div className="demo-card text-center text-sm">Cargando…</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{tournaments.map((t) => (
						<Card key={t.id} className="p-4 flex flex-col justify-between">
							<Link to="/admin/tournaments/$tournamentId" params={{ tournamentId: t.id }} className="no-underline">
								<CardHeader className="p-0"><CardTitle className="text-base">{t.name}</CardTitle></CardHeader>
								<CardContent className="p-0"><Badge variant="outline">{t.sportId}</Badge></CardContent>
							</Link>
							<div className="mt-3 flex gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={async () => {
										if (!confirm(`¿Eliminar torneo ${t.name}?`)) return;
										try {
											await del.mutateAsync(t.id);
										} catch (err) {
											setError(getApiErrorMessage(err));
										}
									}}
								>
									Eliminar
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

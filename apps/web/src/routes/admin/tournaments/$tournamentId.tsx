import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import {
	useCreateEdition,
	useDeleteEdition,
	useTournamentEditions,
	useUpdateTournament,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Select,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/tournaments/$tournamentId")({
	component: AdminTournamentDetailPage,
});

function AdminTournamentDetailPage() {
	const { tournamentId } = Route.useParams();
	const { data: tournamentData } = useQuery({
		queryKey: queryKeys.tournaments.detail(tournamentId),
		queryFn: () => unwrap(api.tournaments({ tournamentId }).get()),
	});
	const { data: editionsData } = useTournamentEditions(api, tournamentId);
	const update = useUpdateTournament(api);
	const createEdition = useCreateEdition(api);
	const deleteEdition = useDeleteEdition(api);

	const t = tournamentData as
		| { id: string; name: string; sportId: string; description?: string | null }
		| undefined;
	const editions =
		(
			editionsData as
				| {
						items: Array<{
							id: string;
							name: string;
							status: string;
							category: string;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];

	const [name, setName] = React.useState("");
	const [eName, setEName] = React.useState("");
	const [eCategory, setECategory] = React.useState("open");
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (t) setName(t.name);
	}, [t]);

	if (!t) return <div className="demo-center text-sm">Cargando torneo…</div>;

	const onUpdate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await update.mutateAsync({ tournamentId, body: { name } as never });
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	const onCreateEdition = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await createEdition.mutateAsync({
				tournamentId,
				body: { name: eName, category: eCategory } as never,
			});
			setEName("");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/tournaments" className="text-sm text-(--sea-ink-soft)">
				← Volver a torneos
			</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>{t.name}</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					<form onSubmit={onUpdate} className="flex gap-2">
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="flex-1"
						/>
						<Button type="submit" disabled={update.isPending}>
							Guardar
						</Button>
					</form>
					{error && (
						<div className="demo-alert-danger mt-2 text-sm">{error}</div>
					)}
				</CardContent>
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Ediciones</h3>
				<form onSubmit={onCreateEdition} className="mt-3 flex flex-wrap gap-2">
					<Input
						value={eName}
						onChange={(e) => setEName(e.target.value)}
						placeholder="2025"
						required
						className="min-w-32 flex-1"
					/>
					<Select
						value={eCategory}
						onChange={(e) => setECategory(e.target.value)}
					>
						<option value="open">open</option>
						<option value="u18">u18</option>
						<option value="senior">senior</option>
					</Select>
					<Button type="submit" disabled={createEdition.isPending}>
						Crear edición
					</Button>
				</form>
				<div className="mt-4 grid gap-2 sm:grid-cols-2">
					{editions.map((ed) => (
						<Card key={ed.id} className="p-3 flex flex-col">
							<Link
								to="/admin/editions/$editionId"
								params={{ editionId: ed.id }}
								className="no-underline"
							>
								<div className="font-bold text-sm">{ed.name}</div>
								<Badge variant="secondary">{ed.status}</Badge>{" "}
								<Badge variant="outline">{ed.category}</Badge>
							</Link>
							<Button
								variant="ghost"
								size="sm"
								className="mt-2 self-start"
								onClick={async () => {
									if (!confirm(`¿Eliminar edición ${ed.name}?`)) return;
									try {
										await deleteEdition.mutateAsync(ed.id);
									} catch (err) {
										setError(getApiErrorMessage(err));
									}
								}}
							>
								Eliminar
							</Button>
						</Card>
					))}
				</div>
				{editions.length === 0 && (
					<div className="text-sm text-(--sea-ink-soft) mt-2">
						Sin ediciones
					</div>
				)}
			</Card>
		</div>
	);
}

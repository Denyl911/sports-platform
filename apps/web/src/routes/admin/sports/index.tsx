import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreateSport,
	useDeleteSport,
	useSports,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	Input,
	Label,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/sports/")({
	component: AdminSportsPage,
});

function AdminSportsPage() {
	const { data: sportsData } = useSports(api);
	const create = useCreateSport(api);
	const del = useDeleteSport(api);
	const sports =
		(
			sportsData as
				| {
						items: Array<{
							id: string;
							name: string;
							hasDraws?: boolean | null;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const [id, setId] = React.useState("");
	const [name, setName] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await create.mutateAsync({ id, name } as never);
			setId("");
			setName("");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Deportes</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear deporte</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<div className="w-32">
						<Label>ID (slug)</Label>
						<Input
							value={id}
							onChange={(e) => setId(e.target.value)}
							placeholder="football"
							required
						/>
					</div>
					<div className="flex-1 min-w-40">
						<Label>Nombre</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Fútbol"
							required
						/>
					</div>
					<div className="flex items-end">
						<Button type="submit" disabled={create.isPending}>
							Crear
						</Button>
					</div>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
			</Card>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{sports.map((s) => (
					<Card key={s.id} className="p-4 flex flex-col">
						<Link
							to="/admin/sports/$sportId"
							params={{ sportId: s.id }}
							className="no-underline"
						>
							<CardHeader className="p-0">
								<CardTitle className="text-base">{s.name}</CardTitle>
							</CardHeader>
							<Badge variant="outline">{s.id}</Badge>
							{s.hasDraws !== undefined && (
								<Badge
									className="ml-2"
									variant={s.hasDraws ? "success" : "secondary"}
								>
									{s.hasDraws ? "empates" : "sin empates"}
								</Badge>
							)}
						</Link>
						<Button
							variant="ghost"
							size="sm"
							className="mt-2 self-start"
							onClick={async () => {
								if (!confirm(`¿Eliminar deporte ${s.name}?`)) return;
								try {
									await del.mutateAsync(s.id);
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
			{sports.length === 0 && (
				<div className="demo-card text-center text-sm">No hay deportes</div>
			)}
		</div>
	);
}

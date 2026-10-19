import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import {
	useCreateTournament,
	useDeleteTournament,
	useSports,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
	Skeleton,
	toast,
	useConfirm,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

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
	const confirm = useConfirm();

	const [name, setName] = React.useState("");
	const [sportId, setSportId] = React.useState("");

	const tournaments =
		(
			tournamentsData as
				| {
						items: Array<{ id: string; name: string; sportId: string }>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const sports =
		(
			sportsData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];

	React.useEffect(() => {
		if (sports.length && !sportId) setSportId(sports[0]!.id);
	}, [sports, sportId]);

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await create.mutateAsync({ name, sportId } as never);
			setName("");
			toast.success(
				"Torneo creado",
				`«${name.trim()}» está listo en la lista.`,
			);
		} catch (err) {
			toast.error("No se pudo crear el torneo", getApiErrorMessage(err));
		}
	};

	const onDelete = async (id: string, name: string) => {
		const ok = await confirm({
			title: "Eliminar torneo",
			description: `Se elimina «${name}» y se pierden sus ediciones. No se puede deshacer.`,
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await del.mutateAsync(id);
			toast.success("Torneo eliminado");
		} catch (err) {
			toast.error("No se pudo eliminar el torneo", getApiErrorMessage(err));
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
						<Input
							id="t-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							placeholder="Copa Apertura"
						/>
					</div>
					<div className="w-48">
						<Label htmlFor="t-sport">Deporte</Label>
						<Select
							id="t-sport"
							value={sportId}
							onChange={(e) => setSportId(e.target.value)}
						>
							{sports.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} ({s.id})
								</option>
							))}
						</Select>
					</div>
					<div className="flex items-end">
						<Button
							type="submit"
							disabled={create.isPending || !name || !sportId}
						>
							{create.isPending ? "Creando…" : "Crear"}
						</Button>
					</div>
				</form>
			</Card>

			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{tournaments.map((t) => (
						<Card key={t.id} className="p-4 flex flex-col justify-between">
							<Link
								to="/admin/tournaments/$tournamentId"
								params={{ tournamentId: t.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="text-base">{t.name}</CardTitle>
								</CardHeader>
								<CardContent className="p-0">
									<Badge variant="outline">{t.sportId}</Badge>
								</CardContent>
							</Link>
							<div className="mt-3 flex gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onDelete(t.id, t.name)}
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

import { queryKeys, unwrap } from "@sports/api-client";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Select,
	Skeleton,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/tournaments/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.tournaments.list(),
			queryFn: () => unwrap(api.tournaments.get({ query: {} as never })),
		});
	},
	head: () => ({
		meta: [
			{ title: "Torneos — Sports Platform" },
			{
				name: "description",
				content: "Todos los torneos de la plataforma, filtrables por deporte.",
			},
		],
	}),
	component: TournamentsPage,
});

function TournamentsPage() {
	const [sportId, setSportId] = React.useState<string | undefined>(undefined);
	const [limit, setLimit] = React.useState(20);
	const [offset, setOffset] = React.useState(0);
	const { data, isPending, error } = useSuspenseQuery({
		queryKey: queryKeys.tournaments.list({ sportId, limit, offset } as Record<
			string,
			unknown
		>),
		queryFn: () =>
			unwrap(
				api.tournaments.get({ query: { sportId, limit, offset } as never }),
			),
	});

	if (isPending)
		return (
			<div className="demo-page">
				<Skeleton className="h-32 w-full" />
			</div>
		);
	if (error)
		return (
			<div className="demo-page">
				<div className="demo-alert-danger">{String(error)}</div>
			</div>
		);

	const { items: tournaments, total } = data as {
		items: Array<{
			id: string;
			name: string;
			sportId: string;
			description?: string | null;
		}>;
		total: number;
	};
	const totalPages = Math.ceil(total / limit);
	const page = Math.floor(offset / limit);

	return (
		<div className="demo-page space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="demo-title">Torneos</h1>
				<Badge variant="secondary">{total} total</Badge>
			</div>

			<div className="flex flex-wrap gap-2">
				<Input
					placeholder="Filtrar por sportId"
					value={sportId ?? ""}
					onChange={(e) => {
						setSportId(e.target.value || undefined);
						setOffset(0);
					}}
					className="max-w-xs"
				/>
				<Select
					value={String(limit)}
					onChange={(e) => {
						setLimit(Number(e.target.value));
						setOffset(0);
					}}
				>
					<option value="10">10 por página</option>
					<option value="20">20 por página</option>
					<option value="50">50 por página</option>
				</Select>
				{sportId && (
					<Button
						variant="ghost"
						onClick={() => {
							setSportId(undefined);
							setOffset(0);
						}}
					>
						Limpiar filtro
					</Button>
				)}
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{tournaments.map((t) => (
					<Link
						key={t.id}
						to="/tournaments/$tournamentId"
						params={{ tournamentId: t.id }}
						className="no-underline"
					>
						<Card className="h-full p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="p-0 pb-2">
								<CardTitle className="text-base">{t.name}</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								<p className="text-sm text-(--sea-ink-soft) line-clamp-2">
									{t.description ?? "Sin descripción"}
								</p>
								<div className="mt-3 flex gap-2">
									<Badge variant="outline">{t.sportId}</Badge>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
			{tournaments.length === 0 && (
				<div className="demo-card text-center text-sm text-(--sea-ink-soft)">
					No hay torneos aún.
				</div>
			)}

			<div className="flex items-center justify-between pt-2">
				<Button
					variant="secondary"
					disabled={offset === 0}
					onClick={() => setOffset(Math.max(0, offset - limit))}
				>
					Anterior
				</Button>
				<span className="text-sm text-(--sea-ink-soft)">
					Página {page + 1} de {Math.max(1, totalPages)} — {total} torneos
				</span>
				<Button
					variant="secondary"
					disabled={offset + limit >= total}
					onClick={() => setOffset(offset + limit)}
				>
					Siguiente
				</Button>
			</div>
		</div>
	);
}

import { queryKeys, unwrap } from "@sports/api-client";
import { Badge, Card, CardHeader, CardTitle, Input, Select } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/teams/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.teams.list(),
			queryFn: () => unwrap(api.teams.get({ query: {} })),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.clubs.lists(),
			queryFn: () => unwrap(api.clubs.get()),
		});
	},
	component: TeamsPage,
});

function TeamsPage() {
	const [clubId, setClubId] = React.useState<string | undefined>(undefined);
	const [category, setCategory] = React.useState<string | undefined>(undefined);
	const filters = {
		...(clubId ? { clubId } : {}),
		...(category ? { category } : {}),
	};

	const { data } = useSuspenseQuery({
		queryKey: queryKeys.teams.list(filters),
		queryFn: () => unwrap(api.teams.get({ query: filters })),
	});
	const { data: clubsData } = useSuspenseQuery({
		queryKey: queryKeys.clubs.lists(),
		queryFn: () => unwrap(api.clubs.get()),
	});
	const teams = (
		data as {
			items: Array<{
				id: string;
				name: string;
				clubId: string;
				category?: string | null;
			}>;
			total: number;
		}
	).items;
	const clubs = (
		clubsData as { items: Array<{ id: string; name: string }>; total: number }
	).items;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">Equipos</h1>
			<div className="flex flex-wrap gap-2">
				<Select
					value={clubId ?? ""}
					onChange={(e) => setClubId(e.target.value || undefined)}
					className="max-w-xs"
				>
					<option value="">Todos los clubes</option>
					{clubs.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</Select>
				<Input
					value={category ?? ""}
					onChange={(e) => setCategory(e.target.value || undefined)}
					placeholder="Categoría (ej. open)"
					className="max-w-xs"
				/>
			</div>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{teams.map((t) => (
					<Link
						key={t.id}
						to="/teams/$teamId"
						params={{ teamId: t.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="p-0">
								<CardTitle className="text-base">{t.name}</CardTitle>
							</CardHeader>
							<div className="mt-2 flex gap-2">
								<Badge variant="outline">{t.clubId.slice(0, 8)}</Badge>
								{t.category && <Badge>{t.category}</Badge>}
							</div>
						</Card>
					</Link>
				))}
			</div>
			{teams.length === 0 && (
				<div className="demo-card text-center text-sm">
					No hay equipos con esos filtros.
				</div>
			)}
		</div>
	);
}

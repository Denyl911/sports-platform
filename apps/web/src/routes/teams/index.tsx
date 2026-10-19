import { queryKeys, unwrap } from "@sports/api-client";
import {
	ArrowRight,
	Badge,
	Building2,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
	Input,
	Search,
	Select,
	Users,
} from "@sports/ui";
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
	head: () => ({
		meta: [{ title: "Equipos — Sports Platform" }],
	}),
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
				<div className="relative">
					<Search
						{...DECORATIVE}
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--sea-ink-soft)"
					/>
					<Input
						value={category ?? ""}
						onChange={(e) => setCategory(e.target.value || undefined)}
						placeholder="Categoría (ej. open)"
						className="max-w-xs pl-9"
					/>
				</div>
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
							<CardHeader className="flex flex-row items-center justify-between gap-2 p-0">
								<CardTitle className="text-base">{t.name}</CardTitle>
								<ArrowRight
									{...DECORATIVE}
									className="size-4 shrink-0 text-(--sea-ink-soft)"
								/>
							</CardHeader>
							<div className="mt-2 flex gap-2">
								<Badge variant="outline" className="gap-1.5">
									<Building2 {...DECORATIVE} className="size-3.5" />
									{t.clubId.slice(0, 8)}
								</Badge>
								{t.category && <Badge>{t.category}</Badge>}
							</div>
						</Card>
					</Link>
				))}
			</div>
			{teams.length === 0 && (
				<EmptyState
					icon={Users}
					title="No hay equipos con esos filtros"
					description="Prueba con otro club o deporte en los filtros de arriba."
				/>
			)}
		</div>
	);
}

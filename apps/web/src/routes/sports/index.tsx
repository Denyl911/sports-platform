import { queryKeys, unwrap } from "@sports/api-client";
import {
	ArrowRight,
	Badge,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	Dumbbell,
	EmptyState,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/sports/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.sports.lists(),
			queryFn: () => unwrap(api.sports.get()),
		});
	},
	head: () => ({
		meta: [{ title: "Deportes — Sports Platform" }],
	}),
	component: SportsPage,
});

function SportsPage() {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.sports.lists(),
		queryFn: () => unwrap(api.sports.get()),
	});
	const sports = (
		data as {
			items: Array<{ id: string; name: string; hasDraws?: boolean | null }>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">Deportes</h1>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{sports.map((s) => (
					<Link
						key={s.id}
						to="/sports/$sportId"
						params={{ sportId: s.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="flex flex-row items-center justify-between gap-2 p-0">
								<CardTitle className="text-base">{s.name}</CardTitle>
								<ArrowRight
									{...DECORATIVE}
									className="size-4 shrink-0 text-(--sea-ink-soft)"
								/>
							</CardHeader>
							<Badge variant="outline" className="gap-1.5">
								<Dumbbell {...DECORATIVE} className="size-3.5" />
								{s.id}
							</Badge>
							{s.hasDraws !== undefined && (
								<Badge
									className="ml-2"
									variant={s.hasDraws ? "success" : "secondary"}
								>
									{s.hasDraws ? "Con empate" : "Sin empate"}
								</Badge>
							)}
						</Card>
					</Link>
				))}
			</div>
			{sports.length === 0 && (
				<EmptyState
					icon={Dumbbell}
					title="No hay deportes"
					description="Aún no se publica ningún deporte."
				/>
			)}
		</div>
	);
}

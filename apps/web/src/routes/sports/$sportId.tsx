import { queryKeys, unwrap } from "@sports/api-client";
import { Badge, Card, SportIcon } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/sports/$sportId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.sports.detail(params.sportId),
			queryFn: () => unwrap(api.sports({ id: params.sportId }).get()),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.sports.eventTypes(params.sportId),
			queryFn: () =>
				unwrap(
					api
						.sports({ id: params.sportId })
						["event-types"].get({ query: {} as never }),
				),
		});
	},
	component: SportDetailPage,
});

function SportDetailPage() {
	const { sportId } = Route.useParams();
	const { data: sport } = useSuspenseQuery({
		queryKey: queryKeys.sports.detail(sportId),
		queryFn: () => unwrap(api.sports({ id: sportId }).get()),
	});
	const { data: eventTypesData } = useSuspenseQuery({
		queryKey: queryKeys.sports.eventTypes(sportId),
		queryFn: () =>
			unwrap(
				api.sports({ id: sportId })["event-types"].get({ query: {} as never }),
			),
	});

	const s = sport as { id: string; name: string; hasDraws?: boolean | null };
	const eventTypes = (
		eventTypesData as {
			items: Array<{
				id: string;
				code: string;
				name: string;
				affectsScore: boolean;
			}>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-6">
			<div className="flex items-center gap-3">
				<SportIcon sportId={s.id} />
				<h1 className="demo-title">{s.name}</h1>
			</div>
			<div className="flex gap-2">
				<Badge variant="outline">{s.id}</Badge>
				<Badge variant={s.hasDraws ? "success" : "secondary"}>
					{s.hasDraws ? "Con empates" : "Sin empates"}
				</Badge>
			</div>
			<div>
				<h2 className="demo-section-title mb-2">Tipos de evento</h2>
				<div className="flex flex-wrap gap-2">
					{eventTypes.map((e) => (
						<Badge key={e.id} variant={e.affectsScore ? "success" : "outline"}>
							{e.code} {e.affectsScore ? "⚽" : ""}
						</Badge>
					))}
				</div>
				{eventTypes.length === 0 && (
					<div className="demo-card text-center text-sm mt-2">
						Sin tipos de evento.
					</div>
				)}
			</div>
			<Card className="p-4">
				<p className="text-sm text-(--sea-ink-soft)">ID: {s.id}</p>
			</Card>
		</div>
	);
}

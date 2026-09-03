import { queryKeys, unwrap } from "@sports/api-client";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/editions/$editionId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.stages.listByEdition(params.editionId),
			queryFn: () =>
				unwrap(
					api.tournaments
						.editions({ editionId: params.editionId })
						.stages.get(),
				),
		});
	},
	component: EditionDetailPage,
});

function EditionDetailPage() {
	const { editionId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.stages.listByEdition(editionId),
		queryFn: () => unwrap(api.tournaments.editions({ editionId }).stages.get()),
	});

	const stages = (
		data as {
			items: Array<{
				id: string;
				name: string;
				stageType: string;
				sequenceOrder: number;
			}>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-6">
			<h1 className="demo-title">Etapas</h1>
			<div className="grid gap-3 sm:grid-cols-2">
				{stages.map((s) => (
					<Link
						key={s.id}
						to="/stages/$stageId"
						params={{ stageId: s.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="p-0">
								<CardTitle className="text-base">{s.name}</CardTitle>
							</CardHeader>
							<CardContent className="p-0">
								<div className="flex gap-2 mt-2">
									<Badge variant="outline">{s.stageType}</Badge>
									<Badge variant="secondary">#{s.sequenceOrder}</Badge>
								</div>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
			{stages.length === 0 && (
				<div className="demo-card text-center text-sm">No hay etapas.</div>
			)}
		</div>
	);
}

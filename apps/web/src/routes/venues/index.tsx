import { queryKeys, unwrap } from "@sports/api-client";
import { Card, CardHeader, CardTitle } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/venues/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.venues.lists(),
			queryFn: () => unwrap(api.venues.get()),
		});
	},
	head: () => ({
		meta: [{ title: "Sedes — Sports Platform" }],
	}),
	component: VenuesPage,
});

function VenuesPage() {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.venues.lists(),
		queryFn: () => unwrap(api.venues.get()),
	});
	const venues = (
		data as {
			items: Array<{ id: string; name: string; address?: string | null }>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">Sedes</h1>
			<div className="grid gap-3 sm:grid-cols-2">
				{venues.map((v) => (
					<Link
						key={v.id}
						to="/venues/$venueId"
						params={{ venueId: v.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="p-0">
								<CardTitle className="text-base">{v.name}</CardTitle>
							</CardHeader>
							<p className="text-xs text-(--sea-ink-soft)">
								{v.address ?? "Sin dirección"}
							</p>
						</Card>
					</Link>
				))}
			</div>
			{venues.length === 0 && (
				<div className="demo-card text-center text-sm">No hay sedes.</div>
			)}
		</div>
	);
}

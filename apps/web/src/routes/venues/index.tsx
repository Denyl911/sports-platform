import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { Card, CardHeader, CardTitle } from "@sports/ui";

export const Route = createFileRoute("/venues/")({
	loader: async ({ context }) => {
		const qc = (context as { queryClient: import("@tanstack/react-query").QueryClient }).queryClient;
		await qc.ensureQueryData({
			queryKey: queryKeys.venues.lists(),
			queryFn: () => unwrap(api.venues.get()),
		});
	},
	component: VenuesPage,
});

function VenuesPage() {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.venues.lists(),
		queryFn: () => unwrap(api.venues.get()),
	});
	const venues = (data as { items: Array<{ id: string; name: string; address?: string | null }>; total: number }).items;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">Sedes</h1>
			<div className="grid gap-3 sm:grid-cols-2">
				{venues.map((v) => (
					<Link key={v.id} to="/venues/$venueId" params={{ venueId: v.id }} className="no-underline">
						<Card className="p-4 hover:border-[var(--lagoon-deep)]">
							<CardHeader className="p-0"><CardTitle className="text-base">{v.name}</CardTitle></CardHeader>
							<p className="text-xs text-[var(--sea-ink-soft)]">{v.address ?? "Sin dirección"}</p>
						</Card>
					</Link>
				))}
			</div>
			{venues.length === 0 && <div className="demo-card text-center text-sm">No hay sedes.</div>}
		</div>
	);
}

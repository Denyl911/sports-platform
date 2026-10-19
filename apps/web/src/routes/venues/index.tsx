import { queryKeys, unwrap } from "@sports/api-client";
import {
	ArrowRight,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
	MapPin,
} from "@sports/ui";
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
							<CardHeader className="flex flex-row items-center justify-between gap-2 p-0">
								<CardTitle className="text-base">{v.name}</CardTitle>
								<ArrowRight
									{...DECORATIVE}
									className="size-4 shrink-0 text-(--sea-ink-soft)"
								/>
							</CardHeader>
							<p className="flex items-center gap-1.5 text-xs text-(--sea-ink-soft)">
								<MapPin {...DECORATIVE} className="size-3.5 shrink-0" />
								{v.address ?? "Sin dirección"}
							</p>
						</Card>
					</Link>
				))}
			</div>
			{venues.length === 0 && (
				<EmptyState
					icon={MapPin}
					title="No hay sedes"
					description="Aún no se publica ninguna sede."
				/>
			)}
		</div>
	);
}

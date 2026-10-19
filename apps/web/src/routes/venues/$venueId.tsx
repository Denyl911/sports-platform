import { queryKeys, unwrap } from "@sports/api-client";
import { Card, DECORATIVE, MapPin, VenuePill } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/venues/$venueId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		const venue = await qc.query({
			staleTime: "static",
			queryKey: queryKeys.venues.detail(params.venueId),
			queryFn: () => unwrap(api.venues({ id: params.venueId }).get()),
		});
		return venue;
	},
	head: ({ loaderData }) => {
		const v = loaderData as { name?: string } | undefined;
		return {
			meta: [
				{ title: `${v?.name ?? "Sede"} — Sports Platform` },
				{
					name: "description",
					content: "Sede deportiva: partidos programados y ubicación.",
				},
			],
		};
	},
	component: VenueDetailPage,
});

function VenueDetailPage() {
	const { venueId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.venues.detail(venueId),
		queryFn: () => unwrap(api.venues({ id: venueId }).get()),
	});
	const v = data as {
		id: string;
		name: string;
		address?: string | null;
		fieldCount?: number | null;
	};

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">{v.name}</h1>
			<VenuePill name={v.name} address={v.address} />
			<Card className="p-4 space-y-1 text-sm">
				<div>ID: {v.id}</div>
				<div className="flex items-center gap-1.5">
					<MapPin {...DECORATIVE} className="size-3.5 shrink-0" />
					Dirección: {v.address ?? "—"}
				</div>
				<div>Canchas: {v.fieldCount ?? "—"}</div>
			</Card>
		</div>
	);
}

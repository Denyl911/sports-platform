import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { Card } from "@sports/ui";

export const Route = createFileRoute("/players/$playerId")({
	loader: async ({ context, params }) => {
		const qc = (context as { queryClient: import("@tanstack/react-query").QueryClient }).queryClient;
		await qc.ensureQueryData({
			queryKey: queryKeys.players.detail(params.playerId),
			queryFn: () => unwrap(api.players({ id: params.playerId }).get()),
		});
	},
	component: PlayerDetailPage,
});

function PlayerDetailPage() {
	const { playerId } = Route.useParams();
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.players.detail(playerId),
		queryFn: () => unwrap(api.players({ id: playerId }).get()),
	});
	const p = data as { id: string; firstName: string; lastName: string; birthDate?: string | null; idCardNumber?: string | null };

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">{p.firstName} {p.lastName}</h1>
			<Card className="p-4 space-y-1 text-sm">
				<div>ID: {p.id}</div>
				<div>DNI: {p.idCardNumber ?? "—"}</div>
				<div>Nacimiento: {p.birthDate ?? "—"}</div>
			</Card>
		</div>
	);
}

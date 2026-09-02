import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { Card, CardHeader, CardTitle, Badge, Select } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/matches/")({
	loader: async ({ context }) => {
		const qc = (context as { queryClient: import("@tanstack/react-query").QueryClient }).queryClient;
		await qc.ensureQueryData({
			queryKey: queryKeys.matches.list(),
			queryFn: () => unwrap(api.matches.get({ query: {} as never })),
		});
	},
	component: MatchesPage,
});

function MatchesPage() {
	const [status, setStatus] = React.useState<string | undefined>(undefined);
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.matches.list(status ? { status } : {}),
		queryFn: () => unwrap(api.matches.get({ query: (status ? { status } : {}) as never })),
	});
	const matches = (data as { items: Array<{ id: string; status: string; homeScore: number; awayScore: number }>; total: number }).items;

	return (
		<div className="demo-page space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="demo-title">Partidos</h1>
				<Badge variant="secondary">{matches.length} partidos</Badge>
			</div>
			<Select value={status ?? ""} onChange={(e) => setStatus(e.target.value || undefined)} className="max-w-xs">
				<option value="">Todos los estados</option>
				<option value="scheduled">scheduled</option>
				<option value="in_progress">in_progress</option>
				<option value="paused">paused</option>
				<option value="finished">finished</option>
				<option value="cancelled">cancelled</option>
				<option value="walkover">walkover</option>
			</Select>
			<div className="grid gap-3 sm:grid-cols-2">
				{matches.map((m) => (
					<Link key={m.id} to="/matches/$matchId" params={{ matchId: m.id }} className="no-underline">
						<Card className="p-4 hover:border-[var(--lagoon-deep)]">
							<CardHeader className="p-0"><CardTitle className="text-sm">Partido {m.id.slice(0, 8)}</CardTitle></CardHeader>
							<div className="flex gap-2 mt-1">
								<Badge>{m.status}</Badge>
								<Badge variant="outline">{m.homeScore} : {m.awayScore}</Badge>
							</div>
						</Card>
					</Link>
				))}
			</div>
			{matches.length === 0 && <div className="demo-card text-center text-sm">No hay partidos con ese estado.</div>}
		</div>
	);
}

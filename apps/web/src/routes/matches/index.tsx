import { type MatchWithTeams, queryKeys, unwrap } from "@sports/api-client";
import {
	ArrowRight,
	Badge,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
	Medal,
	Radio,
	Select,
	Swords,
	Users,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/matches/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.matches.list(),
			queryFn: () => unwrap(api.matches.get({ query: {} as never })),
		});
	},
	head: () => ({
		meta: [
			{ title: "Partidos — Sports Platform" },
			{
				name: "description",
				content: "Resultados y partidos programados de todos los torneos.",
			},
		],
	}),
	component: MatchesPage,
});

function MatchesPage() {
	const [status, setStatus] = React.useState<string | undefined>(undefined);
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.matches.list(status ? { status } : {}),
		queryFn: () =>
			unwrap(api.matches.get({ query: (status ? { status } : {}) as never })),
	});
	const matches = (data as { items: MatchWithTeams[]; total: number }).items;

	return (
		<div className="demo-page space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="demo-title">Partidos</h1>
				<Badge variant="secondary">{matches.length} partidos</Badge>
			</div>
			<Select
				value={status ?? ""}
				onChange={(e) => setStatus(e.target.value || undefined)}
				className="max-w-xs"
			>
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
					<Link
						key={m.id}
						to="/matches/$matchId"
						params={{ matchId: m.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="flex flex-row items-start justify-between gap-2 p-0">
								<CardTitle className="flex items-center gap-2 text-sm">
									<Users
										{...DECORATIVE}
										className="size-4 shrink-0 text-(--sea-ink-soft)"
									/>
									<span>
										{m.homeTeam?.name ?? "Por definir"} vs{" "}
										{m.awayTeam?.name ?? "Por definir"}
									</span>
								</CardTitle>
								<ArrowRight
									{...DECORATIVE}
									className="size-4 shrink-0 text-(--sea-ink-soft)"
								/>
							</CardHeader>
							<div className="mt-1 flex gap-2">
								<Badge className="gap-1.5">
									{m.status === "in_progress" && (
										<Radio {...DECORATIVE} className="size-3.5" />
									)}
									{m.status}
								</Badge>
								<Badge variant="outline" className="gap-1.5">
									<Medal {...DECORATIVE} className="size-3.5" />
									{m.homeScore} : {m.awayScore}
								</Badge>
							</div>
						</Card>
					</Link>
				))}
			</div>
			{matches.length === 0 && (
				<EmptyState
					icon={Swords}
					title="No hay partidos con ese estado"
					description="Prueba con otro filtro o revisa más tarde."
				/>
			)}
		</div>
	);
}

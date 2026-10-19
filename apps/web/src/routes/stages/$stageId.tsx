import { type MatchWithTeams, queryKeys, unwrap } from "@sports/api-client";
import {
	Badge,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	DECORATIVE,
	Radio,
	Swords,
	Table2,
	Users,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/stages/$stageId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.groups.listByStage(params.stageId),
			queryFn: () =>
				unwrap(
					api.tournaments.stages({ stageId: params.stageId }).groups.get(),
				),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.matches.list({ stageId: params.stageId }),
			queryFn: () =>
				unwrap(
					api.matches.get({ query: { stageId: params.stageId } as never }),
				),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.registrations.byStage(params.stageId),
			queryFn: () =>
				unwrap(api.stages({ stageId: params.stageId }).registrations.get()),
		});
	},
	head: () => ({
		meta: [
			{ title: "Etapa y partidos — Sports Platform" },
			{
				name: "description",
				content: "Grupos, equipos inscritos y cruces de la etapa.",
			},
		],
	}),
	component: StageDetailPage,
});

function StageDetailPage() {
	const { stageId } = Route.useParams();
	const { data: groupsData } = useSuspenseQuery({
		queryKey: queryKeys.groups.listByStage(stageId),
		queryFn: () => unwrap(api.tournaments.stages({ stageId }).groups.get()),
	});
	const { data: matchesData } = useSuspenseQuery({
		queryKey: queryKeys.matches.list({ stageId }),
		queryFn: () => unwrap(api.matches.get({ query: { stageId } as never })),
	});
	const { data: regsData } = useSuspenseQuery({
		queryKey: queryKeys.registrations.byStage(stageId),
		queryFn: () => unwrap(api.stages({ stageId }).registrations.get()),
	});

	const groups = (
		groupsData as { items: Array<{ id: string; name: string }>; total: number }
	).items;
	const matches = (matchesData as { items: MatchWithTeams[]; total: number })
		.items;
	const registrations = (
		regsData as {
			items: Array<{
				registration: { id: string; teamId: string; groupId: string | null };
				team: { id: string; name: string };
			}>;
			total: number;
		}
	).items;
	const groupNames = new Map(groups.map((g) => [g.id, g.name]));

	return (
		<div className="demo-page space-y-6">
			<h1 className="demo-title">Etapa</h1>
			<div>
				<h2 className="demo-section-title mb-2">Grupos</h2>
				<div className="flex flex-wrap gap-2">
					{groups.map((g) => (
						<Link
							key={g.id}
							to="/standings/$groupId"
							params={{ groupId: g.id }}
							className="no-underline"
						>
							<Badge variant="secondary" className="gap-1.5 px-3 py-1">
								<Table2 {...DECORATIVE} className="size-3.5" />
								{g.name}
							</Badge>
						</Link>
					))}
					{groups.length === 0 && (
						<span className="inline-flex items-center gap-1.5 text-sm text-(--sea-ink-soft)">
							<Table2 {...DECORATIVE} className="size-4" />
							Sin grupos
						</span>
					)}
				</div>
			</div>
			<div>
				<h2 className="demo-section-title mb-2">Inscriptos</h2>
				<div className="flex flex-col gap-1">
					{registrations.map(({ registration, team }) => (
						<div
							key={registration.id}
							className="demo-list-item flex items-center justify-between gap-2 text-sm"
						>
							<Link
								to="/teams/$teamId"
								params={{ teamId: team.id }}
								className="flex items-center gap-1.5 no-underline font-semibold"
							>
								<Users
									{...DECORATIVE}
									className="size-4 shrink-0 text-(--sea-ink-soft)"
								/>
								{team.name}
							</Link>
							{registration.groupId && groupNames.get(registration.groupId) ? (
								<Badge variant="secondary" className="gap-1.5">
									<Table2 {...DECORATIVE} className="size-3.5" />
									{groupNames.get(registration.groupId)}
								</Badge>
							) : (
								<Badge variant="outline">sin grupo</Badge>
							)}
						</div>
					))}
					{registrations.length === 0 && (
						<div className="demo-card flex items-center justify-center gap-2 text-center text-sm">
							<Users {...DECORATIVE} className="size-4 text-(--sea-ink-soft)" />
							Sin inscripciones.
						</div>
					)}
				</div>
			</div>
			<div>
				<h2 className="demo-section-title mb-2">Partidos</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					{matches.map((m) => (
						<Link
							key={m.id}
							to="/matches/$matchId"
							params={{ matchId: m.id }}
							className="no-underline"
						>
							<Card className="p-4">
								<CardHeader className="p-0">
									<CardTitle className="text-sm">
										{m.homeTeam?.name ?? "Por definir"} vs{" "}
										{m.awayTeam?.name ?? "Por definir"}
									</CardTitle>
								</CardHeader>
								<CardContent className="p-0">
									<Badge className="gap-1.5">
										{m.status === "in_progress" && (
											<Radio {...DECORATIVE} className="size-3.5" />
										)}
										{m.status}
									</Badge>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
				{matches.length === 0 && (
					<div className="demo-card flex items-center justify-center gap-2 text-center text-sm">
						<Swords {...DECORATIVE} className="size-4 text-(--sea-ink-soft)" />
						Sin partidos.
					</div>
				)}
			</div>
		</div>
	);
}

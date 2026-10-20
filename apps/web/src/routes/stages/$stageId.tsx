import {
	queryKeys,
	type StageFixture as StageFixtureResponse,
	unwrap,
} from "@sports/api-client";
import { Badge, Bracket, DECORATIVE, Table2, Users } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicFixture } from "../../components/PublicFixture";
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
			queryKey: queryKeys.matches.fixture(params.stageId),
			queryFn: () =>
				unwrap(api.stages({ stageId: params.stageId }).fixture.get()),
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
				content: "Fixture por jornada, grupos y equipos inscritos de la etapa.",
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
		queryKey: queryKeys.matches.fixture(stageId),
		queryFn: () => unwrap(api.stages({ stageId }).fixture.get()),
	});
	const { data: regsData } = useSuspenseQuery({
		queryKey: queryKeys.registrations.byStage(stageId),
		queryFn: () => unwrap(api.stages({ stageId }).registrations.get()),
	});

	const groups = (
		groupsData as { items: Array<{ id: string; name: string }>; total: number }
	).items;
	const matches = (matchesData as StageFixtureResponse).items;
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
	const hasBracket = matches.some((match) => match.nextMatchId);
	const maxRound = Math.max(
		0,
		...matches.map((match) => match.roundNumber ?? 1),
	);

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
				<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h2 className="demo-section-title">Fixture</h2>
					<Badge variant="secondary">{matches.length} partidos</Badge>
				</div>
				<PublicFixture
					items={matches}
					groups={groups}
					roundLabel={hasBracket ? "Ronda" : "Jornada"}
				/>
			</div>
			{hasBracket && (
				<div>
					<h2 className="demo-section-title mb-2">Llave</h2>
					<Bracket
						matches={matches.map((m) => {
							const round = m.roundNumber ?? 1;
							const distance = maxRound - round;
							const label =
								distance === 0
									? "Final"
									: distance === 1
										? "Semifinal"
										: distance === 2
											? "Cuartos de final"
											: distance === 3
												? "Octavos de final"
												: `Ronda ${round}`;
							return {
								id: m.id,
								roundLabel: label,
								homeTeam: m.homeTeam,
								awayTeam: m.awayTeam,
								homeScore: m.homeScore,
								awayScore: m.awayScore,
								status: m.status,
								winnerTeamId: m.winnerTeamId,
								nextMatchId: m.nextMatchId,
							};
						})}
					/>
				</div>
			)}
		</div>
	);
}

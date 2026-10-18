import { queryKeys, unwrap } from "@sports/api-client";
import { Badge, Card, CardHeader, CardTitle } from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/clubs/$clubId")({
	loader: async ({ context, params }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		const club = await qc.query({
			staleTime: "static",
			queryKey: queryKeys.clubs.detail(params.clubId),
			queryFn: () => unwrap(api.clubs({ id: params.clubId }).get()),
		});
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.teams.list({ clubId: params.clubId }),
			queryFn: () =>
				unwrap(api.teams.get({ query: { clubId: params.clubId } })),
		});
		return club;
	},
	head: ({ loaderData }) => {
		const c = loaderData as { name?: string } | undefined;
		return {
			meta: [
				{ title: `${c?.name ?? "Club"} — Sports Platform` },
				{
					name: "description",
					content: "Equipos del club y su actividad en los torneos.",
				},
			],
		};
	},
	component: ClubDetailPage,
});

function ClubDetailPage() {
	const { clubId } = Route.useParams();
	const { data: clubData } = useSuspenseQuery({
		queryKey: queryKeys.clubs.detail(clubId),
		queryFn: () => unwrap(api.clubs({ id: clubId }).get()),
	});
	const { data: teamsData } = useSuspenseQuery({
		queryKey: queryKeys.teams.list({ clubId }),
		queryFn: () => unwrap(api.teams.get({ query: { clubId } })),
	});

	const club = clubData as {
		id: string;
		name: string;
		logoUrl?: string | null;
	};
	const teams = (
		teamsData as {
			items: Array<{
				id: string;
				name: string;
				category?: string | null;
			}>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-6">
			<div className="flex items-center gap-3">
				{club.logoUrl ? (
					<img
						src={club.logoUrl}
						alt={`Escudo de ${club.name}`}
						className="h-14 w-14 rounded-full object-cover"
					/>
				) : (
					<span className="flex h-14 w-14 items-center justify-center rounded-full bg-(--chip-bg) text-2xl font-black text-(--sea-ink)">
						{club.name.charAt(0).toUpperCase()}
					</span>
				)}
				<h1 className="demo-title">{club.name}</h1>
			</div>

			<div>
				<h2 className="demo-section-title mb-2">Equipos</h2>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{teams.map((t) => (
						<Link
							key={t.id}
							to="/teams/$teamId"
							params={{ teamId: t.id }}
							className="no-underline"
						>
							<Card className="p-4 hover:border-(--lagoon-deep)">
								<CardHeader className="p-0">
									<CardTitle className="text-base">{t.name}</CardTitle>
								</CardHeader>
								{t.category && (
									<div className="mt-2">
										<Badge>{t.category}</Badge>
									</div>
								)}
							</Card>
						</Link>
					))}
				</div>
				{teams.length === 0 && (
					<div className="demo-card text-center text-sm">
						Este club aún no tiene equipos.
					</div>
				)}
			</div>
		</div>
	);
}

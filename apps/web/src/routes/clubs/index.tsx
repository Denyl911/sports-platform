import { queryKeys, unwrap } from "@sports/api-client";
import {
	ArrowRight,
	Building2,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../lib/api";

export const Route = createFileRoute("/clubs/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.clubs.lists(),
			queryFn: () => unwrap(api.clubs.get()),
		});
	},
	head: () => ({
		meta: [{ title: "Clubes — Sports Platform" }],
	}),
	component: ClubsPage,
});

function ClubsPage() {
	const { data } = useSuspenseQuery({
		queryKey: queryKeys.clubs.lists(),
		queryFn: () => unwrap(api.clubs.get()),
	});
	const clubs = (
		data as {
			items: Array<{
				id: string;
				name: string;
				logoUrl?: string | null;
			}>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">Clubes</h1>
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{clubs.map((c) => (
					<Link
						key={c.id}
						to="/clubs/$clubId"
						params={{ clubId: c.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="p-0">
								<div className="flex items-center gap-3">
									{c.logoUrl ? (
										<img
											src={c.logoUrl}
											alt={`Escudo de ${c.name}`}
											className="h-10 w-10 rounded-full object-cover"
										/>
									) : (
										<span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--chip-bg) text-base font-black text-(--sea-ink)">
											{c.name.charAt(0).toUpperCase()}
										</span>
									)}
									<CardTitle className="text-base">{c.name}</CardTitle>
									<ArrowRight
										{...DECORATIVE}
										className="ml-auto size-4 shrink-0 text-(--sea-ink-soft)"
									/>
								</div>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
			{clubs.length === 0 && (
				<EmptyState
					icon={Building2}
					title="No hay clubes"
					description="Aún no se publica ningún club."
				/>
			)}
		</div>
	);
}

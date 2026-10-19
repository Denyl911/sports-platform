import { queryKeys, unwrap } from "@sports/api-client";
import {
	ArrowRight,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
	Input,
	Search,
	UserRound,
} from "@sports/ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../lib/api";

export const Route = createFileRoute("/players/")({
	loader: async ({ context }) => {
		const qc = (
			context as { queryClient: import("@tanstack/react-query").QueryClient }
		).queryClient;
		await qc.query({
			staleTime: "static",
			queryKey: queryKeys.players.list(),
			queryFn: () => unwrap(api.players.get({ query: {} as never })),
		});
	},
	head: () => ({
		meta: [{ title: "Jugadores — Sports Platform" }],
	}),
	component: PlayersPage,
});

function PlayersPage() {
	const [search, setSearch] = React.useState<string | undefined>(undefined);
	const [input, setInput] = React.useState("");

	React.useEffect(() => {
		const t = setTimeout(() => {
			setSearch(input || undefined);
		}, 300);
		return () => clearTimeout(t);
	}, [input]);

	const { data } = useSuspenseQuery({
		queryKey: queryKeys.players.list(search ? { search } : undefined),
		queryFn: () =>
			unwrap(api.players.get({ query: (search ? { search } : {}) as never })),
	});
	const players = (
		data as {
			items: Array<{
				id: string;
				firstName: string;
				lastName: string;
				idCardNumber?: string | null;
			}>;
			total: number;
		}
	).items;

	return (
		<div className="demo-page space-y-4">
			<h1 className="demo-title">Jugadores</h1>
			<div className="relative">
				<Search
					{...DECORATIVE}
					className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--sea-ink-soft)"
				/>
				<Input
					placeholder="Buscar por apellido…"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					className="max-w-sm pl-9"
				/>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				{players.map((p) => (
					<Link
						key={p.id}
						to="/players/$playerId"
						params={{ playerId: p.id }}
						className="no-underline"
					>
						<Card className="p-4 hover:border-(--lagoon-deep)">
							<CardHeader className="flex flex-row items-center justify-between gap-2 p-0">
								<CardTitle className="text-base">
									{p.firstName} {p.lastName}
								</CardTitle>
								<ArrowRight
									{...DECORATIVE}
									className="size-4 shrink-0 text-(--sea-ink-soft)"
								/>
							</CardHeader>
							<p className="text-xs text-(--sea-ink-soft)">
								{p.idCardNumber ?? "—"}
							</p>
						</Card>
					</Link>
				))}
			</div>
			{players.length === 0 && (
				<EmptyState
					icon={UserRound}
					title="No hay jugadores"
					description="Aún no se publica ningún jugador."
				/>
			)}
		</div>
	);
}

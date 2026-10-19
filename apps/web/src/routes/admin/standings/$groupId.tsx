import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import {
	useRecalculateStandings,
	useUpdateStandingRow,
} from "@sports/api-client/hooks";
import { useGroupLive } from "@sports/api-client/live";
import {
	Badge,
	Button,
	Card,
	EmptyState,
	Input,
	Label,
	ListOrdered,
	RefreshCw,
	Save,
	Select,
	Skeleton,
	StandingsTable,
	toast,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { api, getStoredAccessToken } from "../../../lib/api";

export const Route = createFileRoute("/admin/standings/$groupId")({
	component: AdminStandingsPage,
});

function AdminStandingsPage() {
	const { groupId } = Route.useParams();
	const { data } = useQuery({
		queryKey: queryKeys.standings.byGroup(groupId),
		queryFn: () => unwrap(api.groups({ groupId }).standings.get()),
	});
	const recalc = useRecalculateStandings(api);
	const updateRow = useUpdateStandingRow(api);
	const live = useGroupLive(groupId, {
		getToken: getStoredAccessToken,
		updateCache: true,
	});

	const standings = data as
		| {
				items: Array<{
					standing: {
						id: string;
						rankPosition: number | null;
						played: number;
						won: number;
						drawn: number;
						lost: number;
						points: number;
						scoreFor: number;
						scoreAgainst: number;
						scoreDifference: number;
						bonusPoints?: number | null;
					};
					team: { id: string; name: string };
				}>;
				total: number;
		  }
		| undefined;
	const rows = (standings?.items ?? []).map(({ standing, team }) => ({
		id: standing.id,
		team: { id: team.id, name: team.name },
		played: standing.played,
		won: standing.won,
		drawn: standing.drawn,
		lost: standing.lost,
		points: standing.points,
		scoreFor: standing.scoreFor,
		scoreAgainst: standing.scoreAgainst,
		scoreDifference: standing.scoreDifference,
		// StandingsTable.bonusPoints no acepta null → normalizar a undefined
		bonusPoints: standing.bonusPoints ?? undefined,
		rankPosition: standing.rankPosition,
	}));

	const [selectedId, setSelectedId] = React.useState<string>("");
	const [points, setPoints] = React.useState(0);
	const [bonus, setBonus] = React.useState(0);

	React.useEffect(() => {
		if (rows.length && !selectedId) {
			setSelectedId(rows[0]!.id);
			setPoints(rows[0]!.points);
			setBonus(rows[0]!.bonusPoints ?? 0);
		}
	}, [rows, selectedId]);

	const onRecalc = async () => {
		try {
			await recalc.mutateAsync(groupId);
			toast.success("Posiciones recalculadas");
		} catch (err) {
			toast.error("No se pudo recalcular la tabla", getApiErrorMessage(err));
		}
	};

	const onUpdateRow = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await updateRow.mutateAsync({
				id: selectedId,
				body: { points, bonusPoints: bonus },
			});
			toast.success("Fila actualizada");
		} catch (err) {
			toast.error("No se pudo actualizar la fila", getApiErrorMessage(err));
		}
	};

	return (
		<div className="demo-page space-y-6">
			<div className="flex items-center gap-2">
				<h1 className="demo-title">Standings Admin</h1>
				<Badge variant={live.isOpen ? "success" : "secondary"}>
					{live.status}
				</Badge>
				<Button
					size="sm"
					icon={RefreshCw}
					onClick={onRecalc}
					disabled={recalc.isPending}
				>
					{recalc.isPending ? "Recalculando…" : "Recalcular"}
				</Button>
			</div>
			{live.lastStanding && (
				<div className="demo-alert text-sm">
					Live standing actualizado:{" "}
					{JSON.stringify(live.lastStanding).slice(0, 120)}
				</div>
			)}
			{standings ? (
				rows.length === 0 ? (
					<EmptyState
						icon={ListOrdered}
						title="Sin filas en la tabla"
						description="Recalcula la tabla o registra resultados para poblarla."
					/>
				) : (
					<StandingsTable rows={rows} />
				)
			) : (
				<Skeleton className="h-64 rounded-xl" />
			)}

			<Card className="p-4">
				<h3 className="font-bold">
					Ajuste manual de fila (statistician/organizer)
				</h3>
				<p className="text-sm text-(--sea-ink-soft)">
					El siguiente recálculo sobrescribe el ajuste manual.
				</p>
				<form onSubmit={onUpdateRow} className="mt-3 flex flex-wrap gap-2">
					<Select
						value={selectedId}
						onChange={(e) => {
							const id = e.target.value;
							setSelectedId(id);
							const r = rows.find((x) => x.id === id);
							if (r) {
								setPoints(r.points);
								setBonus(r.bonusPoints ?? 0);
							}
						}}
						className="min-w-48 flex-1"
					>
						{rows.map((r) => (
							<option key={r.id} value={r.id}>
								{r.team.name} — {r.points} pts
							</option>
						))}
					</Select>
					<div>
						<Label>Puntos</Label>
						<Input
							type="number"
							value={points}
							onChange={(e) => setPoints(Number(e.target.value))}
							className="w-20"
						/>
					</div>
					<div>
						<Label>Bonus</Label>
						<Input
							type="number"
							value={bonus}
							onChange={(e) => setBonus(Number(e.target.value))}
							className="w-20"
						/>
					</div>
					<Button type="submit" icon={Save} disabled={updateRow.isPending}>
						Guardar fila
					</Button>
				</form>
			</Card>
		</div>
	);
}

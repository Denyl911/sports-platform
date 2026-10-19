import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreateTournament,
	useDeleteTournament,
	useSports,
	useTournaments,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	EmptyState,
	Field,
	Input,
	Select,
	Skeleton,
	toast,
	useConfirm,
} from "@sports/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { AdminListPager } from "../../../components/AdminListPager";
import {
	type AdminListSearch,
	adminListFilters,
} from "../../../lib/admin-list";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/tournaments/")({
	component: AdminTournamentsPage,
});

function AdminTournamentsPage() {
	const navigate = useNavigate();
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/tournaments",
			search: { ...search, ...patch },
		});
	};
	const search = Route.useSearch() as AdminListSearch;
	const { data: tournamentsData, isPending } = useTournaments(
		api,
		adminListFilters(search),
	);
	const { data: sportsData } = useSports(api);
	const create = useCreateTournament(api);
	const del = useDeleteTournament(api);
	const confirm = useConfirm();

	const [name, setName] = React.useState("");
	const [sportId, setSportId] = React.useState("");
	const [nameError, setNameError] = React.useState<string | null>(null);

	const envelope = tournamentsData as
		| {
				items: Array<{ id: string; name: string; sportId: string }>;
				total: number;
		  }
		| undefined;
	const tournaments = envelope?.items ?? [];
	const total = envelope?.total ?? 0;
	const sports =
		(
			sportsData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];

	React.useEffect(() => {
		if (sports.length && !sportId) setSportId(sports[0]!.id);
	}, [sports, sportId]);

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setNameError("El nombre es obligatorio.");
			return;
		}
		try {
			await create.mutateAsync({ name, sportId } as never);
			setName("");
			setNameError(null);
			toast.success(
				"Torneo creado",
				`«${name.trim()}» está listo en la lista.`,
			);
		} catch (err) {
			setNameError(getApiErrorMessage(err));
			toast.error("No se pudo crear el torneo", getApiErrorMessage(err));
		}
	};

	const onDelete = async (id: string, name: string) => {
		const ok = await confirm({
			title: "Eliminar torneo",
			description: `Se elimina «${name}» y se pierden sus ediciones. No se puede deshacer.`,
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await del.mutateAsync(id);
			toast.success("Torneo eliminado");
		} catch (err) {
			toast.error("No se pudo eliminar el torneo", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="demo-title">Torneos</h1>
				<Badge variant="secondary">{total} total</Badge>
			</div>

			<Card className="p-4">
				<h3 className="mb-3 font-bold">Crear torneo</h3>
				<form onSubmit={onCreate} className="flex flex-wrap gap-3">
					<Field
						label="Nombre"
						htmlFor="t-name"
						className="min-w-48 flex-1"
						error={nameError}
					>
						<Input
							id="t-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Copa Apertura"
						/>
					</Field>
					<div className="w-48">
						<label
							htmlFor="t-sport"
							className="text-sm font-semibold leading-none text-(--sea-ink)"
						>
							Deporte
						</label>
						<Select
							id="t-sport"
							value={sportId}
							onChange={(e) => setSportId(e.target.value)}
						>
							{sports.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} ({s.id})
								</option>
							))}
						</Select>
					</div>
					<div className="flex items-end">
						<Button type="submit" disabled={create.isPending || !sportId}>
							{create.isPending ? "Creando…" : "Crear"}
						</Button>
					</div>
				</form>
			</Card>

			<div className="flex flex-wrap items-end gap-2">
				<label
					htmlFor="t-sort"
					className="text-xs font-bold text-(--sea-ink-soft)"
				>
					Ordenar por
				</label>
				<Select
					id="t-sort"
					value={search.sort ?? ""}
					onChange={(e) =>
						setAdminSearch({
							sort: e.target.value === "name" ? "name" : undefined,
							order: e.target.value === "name" ? "asc" : undefined,
							page: undefined,
						})
					}
					className="w-48"
				>
					<option value="">Más recientes</option>
					<option value="name">Nombre A → Z</option>
				</Select>
				<AdminListPager
					search={search}
					total={total}
					onPage={(p) => setAdminSearch({ page: p })}
					onOrder={(o) => setAdminSearch({ order: o, page: undefined })}
					onQuery={(qq) => setAdminSearch({ q: qq, page: undefined })}
					hasOrder={false}
				/>
			</div>

			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : tournaments.length === 0 ? (
				<EmptyState
					title="No hay torneos"
					description="Crea el primer torneo con el formulario de arriba."
				/>
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{tournaments.map((t) => (
						<Card key={t.id} className="p-4 flex flex-col justify-between">
							<Link
								to="/admin/tournaments/$tournamentId"
								params={{ tournamentId: t.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="text-base">{t.name}</CardTitle>
								</CardHeader>
								<CardContent className="p-0">
									<Badge variant="outline">{t.sportId}</Badge>
								</CardContent>
							</Link>
							<div className="mt-3 flex gap-2">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onDelete(t.id, t.name)}
								>
									Eliminar
								</Button>
							</div>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

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
	CardTitle,
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
import { FirstTournamentGuide } from "../../../components/FirstTournamentGuide";
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
	const search = Route.useSearch() as AdminListSearch;
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/tournaments",
			search: { ...search, ...patch },
		});
	};
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
			const created = (await create.mutateAsync({ name, sportId } as never)) as
				| { id?: string }
				| undefined;
			setName("");
			setNameError(null);
			toast.success(
				"Torneo creado",
				`«${name.trim()}» está listo en la lista.`,
			);
			// El primer torneo lleva directo a su ficha: ahí está el paso
			// siguiente (la edición). Con la lista en marcha, no se interrumpe.
			if (total === 0 && created?.id) {
				navigate({
					to: "/admin/tournaments/$tournamentId",
					params: { tournamentId: created.id },
				});
			}
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
			<h1 className="demo-title">Torneos</h1>

			<Card className="p-4">
				<h3 className="font-bold">Crear torneo</h3>
				<p className="mt-1 max-w-2xl text-sm text-(--sea-ink-soft)">
					Un torneo es la competición. Al crearlo llegarás a su ficha para
					crearle la <strong>edición</strong> (la temporada) y, dentro, las
					etapas y los partidos.
				</p>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-3">
					<Field
						label="Nombre"
						htmlFor="t-name"
						error={nameError}
						className="min-w-56 flex-1"
					>
						<Input
							id="t-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Copa Apertura"
						/>
					</Field>
					<Field label="Deporte" htmlFor="t-sport" className="w-56">
						<Select
							id="t-sport"
							value={sportId}
							onChange={(e) => setSportId(e.target.value)}
						>
							{sports.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name}
								</option>
							))}
						</Select>
					</Field>
					<Button
						type="submit"
						className="self-end"
						disabled={create.isPending || !sportId}
					>
						{create.isPending ? "Creando…" : "Crear"}
					</Button>
				</form>
			</Card>

			<AdminListPager
				search={search}
				total={total}
				itemOne="torneo"
				itemMany="torneos"
				hasOrder={false}
				extra={
					<span className="flex items-center gap-2 text-xs font-bold text-(--sea-ink-soft)">
						Ordenar
						<Select
							aria-label="Ordenar los torneos"
							value={search.sort ?? ""}
							onChange={(e) =>
								setAdminSearch({
									sort: e.target.value === "name" ? "name" : undefined,
									order: e.target.value === "name" ? "asc" : undefined,
									page: undefined,
								})
							}
							className="w-40"
						>
							<option value="">Más recientes</option>
							<option value="name">Nombre A → Z</option>
						</Select>
					</span>
				}
				onPage={(p) => setAdminSearch({ page: p })}
				onOrder={(o) => setAdminSearch({ order: o, page: undefined })}
				onQuery={(qq) => setAdminSearch({ q: qq, page: undefined })}
			/>

			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : tournaments.length === 0 ? (
				<FirstTournamentGuide cta={false} />
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{tournaments.map((t) => (
						<Card
							key={t.id}
							className="group flex flex-col justify-between gap-3 p-4"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<CardTitle className="truncate text-base">{t.name}</CardTitle>
									<Badge variant="outline" className="mt-2">
										{t.sportId}
									</Badge>
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="shrink-0"
									onClick={() => onDelete(t.id, t.name)}
								>
									Eliminar
								</Button>
							</div>
							<Link
								to="/admin/tournaments/$tournamentId"
								params={{ tournamentId: t.id }}
								className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-(--sea-ink) no-underline"
							>
								Ediciones y etapas
								<span
									aria-hidden="true"
									className="transition-transform group-hover:translate-x-0.5"
								>
									→
								</span>
							</Link>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

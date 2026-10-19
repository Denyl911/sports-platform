import { getApiErrorMessage } from "@sports/api-client";
import {
	useClubs,
	useCreateTeam,
	useDeleteTeam,
	useTeams,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
	Field,
	Input,
	Plus,
	Select,
	Skeleton,
	Trash2,
	toast,
	Users,
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

export const Route = createFileRoute("/admin/teams/")({
	component: AdminTeamsPage,
});

function AdminTeamsPage() {
	const navigate = useNavigate();
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/teams",
			search: { ...search, ...patch },
		});
	};
	const search = Route.useSearch() as AdminListSearch;
	// El filtro por club viaja en search params (server-side en el contrato).
	const clubFilter = (
		Route.useSearch() as AdminListSearch & { clubId?: string }
	).clubId;
	const { data: teamsData, isPending } = useTeams(
		api,
		clubFilter
			? { ...adminListFilters(search, 20), clubId: clubFilter }
			: adminListFilters(search, 20),
	);
	const { data: clubsData } = useClubs(api);
	const create = useCreateTeam(api);
	const del = useDeleteTeam(api);
	const confirm = useConfirm();
	const envelope = teamsData as
		| {
				items: Array<{
					id: string;
					name: string;
					clubId: string;
					category?: string | null;
				}>;
				total: number;
		  }
		| undefined;
	const teams = envelope?.items ?? [];
	const total = envelope?.total ?? 0;
	const clubs =
		(
			clubsData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];
	const [name, setName] = React.useState("");
	const [clubId, setClubId] = React.useState("");
	const [category, setCategory] = React.useState("open");
	const [nameError, setNameError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (clubs.length && !clubId) setClubId(clubs[0]!.id);
	}, [clubs, clubId]);

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setNameError("El nombre es obligatorio.");
			return;
		}
		try {
			await create.mutateAsync({ name, clubId, category } as never);
			setName("");
			setNameError(null);
			toast.success("Equipo creado");
		} catch (err) {
			setNameError(getApiErrorMessage(err));
			toast.error("No se pudo crear el equipo", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Equipos</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear equipo</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Field
						label="Nombre"
						htmlFor="team-name"
						className="flex-1 min-w-40"
						error={nameError}
					>
						<Input
							id="team-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Equipo A"
							className="w-full"
						/>
					</Field>
					<div className="w-40">
						<label
							htmlFor="team-club"
							className="text-sm font-semibold leading-none text-(--sea-ink)"
						>
							Club
						</label>
						<Select
							id="team-club"
							value={clubId}
							onChange={(e) => setClubId(e.target.value)}
						>
							{clubs.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</Select>
					</div>
					<div className="w-32">
						<label
							htmlFor="team-category"
							className="text-sm font-semibold leading-none text-(--sea-ink)"
						>
							Categoría
						</label>
						<Select
							id="team-category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
						>
							<option value="open">open</option>
							<option value="u18">u18</option>
							<option value="senior">senior</option>
						</Select>
					</div>
					<Button
						type="submit"
						icon={Plus}
						className="self-end"
						disabled={create.isPending}
					>
						Crear
					</Button>
				</form>
			</Card>
			<div className="flex flex-wrap items-end gap-2">
				<label
					htmlFor="teams-club-filter"
					className="text-xs font-bold text-(--sea-ink-soft)"
				>
					Filtrar por club
				</label>
				<Select
					id="teams-club-filter"
					value={clubFilter ?? ""}
					onChange={(e) =>
						setAdminSearch({
							clubId: e.target.value || undefined,
							page: undefined,
						})
					}
					className="w-56"
				>
					<option value="">Todos los clubes</option>
					{clubs.map((c) => (
						<option key={c.id} value={c.id}>
							{c.name}
						</option>
					))}
				</Select>
				<AdminListPager
					search={search}
					total={total}
					itemOne="equipo"
					itemMany="equipos"
					onPage={(p) => setAdminSearch({ page: p })}
					onOrder={(o) => setAdminSearch({ order: o, page: undefined })}
					onQuery={(qq) => setAdminSearch({ q: qq, page: undefined })}
				/>
			</div>
			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : teams.length === 0 ? (
				<EmptyState
					icon={Users}
					title="No hay equipos"
					description={
						clubFilter
							? "Este club aún no tiene equipos."
							: "Crea el primer equipo con el formulario de arriba."
					}
				/>
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{teams.map((t) => (
						<Card key={t.id} className="p-4 flex flex-col">
							<Link
								to="/admin/teams/$teamId"
								params={{ teamId: t.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="flex items-center gap-2 text-base">
										<Users
											{...DECORATIVE}
											className="size-4 shrink-0 text-(--sea-ink-soft)"
										/>
										{t.name}
									</CardTitle>
								</CardHeader>
								<Badge variant="outline">{t.category ?? "open"}</Badge>
							</Link>
							<Button
								variant="destructive"
								size="icon-sm"
								icon={Trash2}
								aria-label="Eliminar"
								title="Eliminar"
								className="mt-2 self-start"
								onClick={async () => {
									const ok = await confirm({
										title: "Eliminar equipo",
										description: `Se elimina «${t.name}» y se pierden sus jugadores inscritos. No se puede deshacer.`,
										confirmLabel: "Eliminar",
									});
									if (!ok) return;
									try {
										await del.mutateAsync(t.id);
										toast.success("Equipo eliminado");
									} catch (err) {
										toast.error(
											"No se pudo eliminar el equipo",
											getApiErrorMessage(err),
										);
									}
								}}
							/>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

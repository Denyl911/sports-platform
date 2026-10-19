import { getApiErrorMessage } from "@sports/api-client";
import {
	useClubs,
	useCreateClub,
	useDeleteClub,
} from "@sports/api-client/hooks";
import {
	Building2,
	Button,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
	Field,
	Input,
	Plus,
	Skeleton,
	Trash2,
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

export const Route = createFileRoute("/admin/clubs/")({
	component: AdminClubsPage,
});

function AdminClubsPage() {
	const navigate = useNavigate();
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/clubs",
			search: { ...search, ...patch },
		});
	};
	const search = Route.useSearch() as AdminListSearch;
	const { data: clubsData, isPending } = useClubs(
		api,
		adminListFilters(search),
	);
	const create = useCreateClub(api);
	const del = useDeleteClub(api);
	const confirm = useConfirm();
	const envelope = clubsData as
		| { items: Array<{ id: string; name: string }>; total: number }
		| undefined;
	const clubs = envelope?.items ?? [];
	const total = envelope?.total ?? 0;
	const [name, setName] = React.useState("");
	const [nameError, setNameError] = React.useState<string | null>(null);

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setNameError("El nombre es obligatorio.");
			return;
		}
		try {
			await create.mutateAsync({ name } as never);
			setName("");
			setNameError(null);
			toast.success("Club creado", `«${name.trim()}» está listo en la lista.`);
		} catch (err) {
			setNameError(getApiErrorMessage(err));
			toast.error("No se pudo crear el club", getApiErrorMessage(err));
		}
	};

	const onDelete = async (id: string, name: string) => {
		const ok = await confirm({
			title: "Eliminar club",
			description: `Se elimina «${name}» y se pierden sus equipos inscritos. No se puede deshacer.`,
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await del.mutateAsync(id);
			toast.success("Club eliminado");
		} catch (err) {
			toast.error("No se pudo eliminar el club", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Clubes</h1>
			<p className="text-sm text-(--sea-ink-soft)">
				Los clubes son instituciones que agrupan equipos. Cada club puede tener
				múltiples equipos en diferentes categorías.
			</p>
			<Card className="p-4">
				<h3 className="font-bold">Crear club</h3>
				<form onSubmit={onCreate} className="mt-2 flex gap-2">
					<Field
						label="Nombre"
						htmlFor="club-name"
						className="flex-1"
						error={nameError}
					>
						<Input
							id="club-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Ej: Club Atlético River Plate"
							className="w-full"
						/>
					</Field>
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
			<AdminListPager
				search={search}
				total={total}
				itemOne="club"
				itemMany="clubes"
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
			) : clubs.length === 0 ? (
				search.q ? (
					<EmptyState
						icon={Building2}
						title={`Nada coincide con «${search.q}»`}
						description="Prueba con otro nombre o borra la búsqueda."
					/>
				) : (
					<EmptyState
						icon={Building2}
						title="No hay clubes"
						description="Crea el primer club con el formulario de arriba."
					/>
				)
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{clubs.map((c) => (
						<Card key={c.id} className="p-4 flex flex-col">
							<Link
								to="/admin/clubs/$clubId"
								params={{ clubId: c.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="flex items-center gap-2 text-base">
										<Building2
											{...DECORATIVE}
											className="size-4 shrink-0 text-(--sea-ink-soft)"
										/>
										{c.name}
									</CardTitle>
								</CardHeader>
							</Link>
							<Button
								variant="destructive"
								size="icon-sm"
								icon={Trash2}
								aria-label="Eliminar"
								title="Eliminar"
								className="mt-2 self-start"
								onClick={() => onDelete(c.id, c.name)}
							/>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

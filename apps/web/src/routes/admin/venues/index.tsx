import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreateVenue,
	useDeleteVenue,
	useVenues,
} from "@sports/api-client/hooks";
import {
	Button,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	EmptyState,
	Field,
	Input,
	MapPin,
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

export const Route = createFileRoute("/admin/venues/")({
	component: AdminVenuesPage,
});

function AdminVenuesPage() {
	const navigate = useNavigate();
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/venues",
			search: { ...search, ...patch },
		});
	};
	const search = Route.useSearch() as AdminListSearch;
	const { data: venuesData, isPending } = useVenues(
		api,
		adminListFilters(search),
	);
	const create = useCreateVenue(api);
	const del = useDeleteVenue(api);
	const confirm = useConfirm();
	const envelope = venuesData as
		| {
				items: Array<{
					id: string;
					name: string;
					address?: string | null;
					fieldCount?: number | null;
				}>;
				total: number;
		  }
		| undefined;
	const venues = envelope?.items ?? [];
	const total = envelope?.total ?? 0;
	const [name, setName] = React.useState("");
	const [address, setAddress] = React.useState("");
	const [fieldCount, setFieldCount] = React.useState(1);
	const [errors, setErrors] = React.useState<Record<string, string | null>>({});

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			setErrors({ name: "El nombre es obligatorio." });
			return;
		}
		try {
			await create.mutateAsync({
				name,
				address: address || null,
				fieldCount,
			} as never);
			setName("");
			setAddress("");
			setErrors({});
			toast.success("Sede creada");
		} catch (err) {
			setErrors({ name: getApiErrorMessage(err) });
			toast.error("No se pudo crear la sede", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Sedes</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear sede</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Field
						label="Nombre"
						htmlFor="venue-name"
						className="flex-1 min-w-40"
						error={errors.name}
					>
						<Input
							id="venue-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Estadio Municipal"
						/>
					</Field>
					<Field
						label="Dirección"
						htmlFor="venue-address"
						className="flex-1 min-w-40"
					>
						<Input
							id="venue-address"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="Av. Principal 123"
						/>
					</Field>
					<Field label="Canchas" htmlFor="venue-fields" className="w-24">
						<Input
							id="venue-fields"
							type="number"
							value={fieldCount}
							onChange={(e) => setFieldCount(Number(e.target.value))}
							min={1}
						/>
					</Field>
					<div className="flex items-end">
						<Button type="submit" icon={Plus} disabled={create.isPending}>
							Crear
						</Button>
					</div>
				</form>
			</Card>
			<AdminListPager
				search={search}
				total={total}
				itemOne="sede"
				itemMany="sedes"
				onPage={(p) => setAdminSearch({ page: p })}
				onOrder={(o) => setAdminSearch({ order: o, page: undefined })}
				onQuery={(qq) => setAdminSearch({ q: qq, page: undefined })}
				hasSearch
			/>
			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : venues.length === 0 ? (
				search.q ? (
					<EmptyState
						icon={MapPin}
						title={`Nada coincide con «${search.q}»`}
						description="Prueba con otro nombre o borra la búsqueda."
					/>
				) : (
					<EmptyState
						icon={MapPin}
						title="No hay sedes"
						description="Crea la primera sede con el formulario de arriba."
					/>
				)
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{venues.map((v) => (
						<Card key={v.id} className="p-4 flex flex-col">
							<Link
								to="/admin/venues/$venueId"
								params={{ venueId: v.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="flex items-center gap-2 text-base">
										<MapPin
											{...DECORATIVE}
											className="size-4 shrink-0 text-(--sea-ink-soft)"
										/>
										{v.name}
									</CardTitle>
								</CardHeader>
								<div className="text-sm text-(--sea-ink-soft)">
									{v.address ?? "Sin dirección"} · {v.fieldCount ?? 1} canchas
								</div>
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
										title: "Eliminar sede",
										description: `Se elimina «${v.name}» y deja de estar disponible para las ediciones. No se puede deshacer.`,
										confirmLabel: "Eliminar",
									});
									if (!ok) return;
									try {
										await del.mutateAsync(v.id);
										toast.success("Sede eliminada");
									} catch (err) {
										toast.error(
											"No se pudo eliminar la sede",
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

import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreateSport,
	useDeleteSport,
	useSports,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	DECORATIVE,
	Dumbbell,
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

export const Route = createFileRoute("/admin/sports/")({
	component: AdminSportsPage,
});

function AdminSportsPage() {
	const navigate = useNavigate();
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/sports",
			search: { ...search, ...patch },
		});
	};
	const search = Route.useSearch() as AdminListSearch;
	const { data: sportsData, isPending } = useSports(
		api,
		adminListFilters(search),
	);
	const create = useCreateSport(api);
	const del = useDeleteSport(api);
	const confirm = useConfirm();
	const envelope = sportsData as
		| {
				items: Array<{
					id: string;
					name: string;
					hasDraws?: boolean | null;
				}>;
				total: number;
		  }
		| undefined;
	const sports = envelope?.items ?? [];
	const total = envelope?.total ?? 0;
	const [id, setId] = React.useState("");
	const [name, setName] = React.useState("");
	const [errors, setErrors] = React.useState<Record<string, string | null>>({});

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		if (!id.trim() || !name.trim()) {
			setErrors({
				id: id.trim() ? null : "El identificador es obligatorio.",
				name: name.trim() ? null : "El nombre es obligatorio.",
			});
			return;
		}
		try {
			await create.mutateAsync({ id, name } as never);
			setId("");
			setName("");
			setErrors({});
			toast.success("Deporte creado");
		} catch (err) {
			setErrors({ name: getApiErrorMessage(err) });
			toast.error("No se pudo crear el deporte", getApiErrorMessage(err));
		}
	};

	const onDelete = async (sportId: string, nameOf: string) => {
		const ok = await confirm({
			title: "Eliminar deporte",
			description: `Se elimina «${nameOf}». No se puede deshacer.`,
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await del.mutateAsync(sportId);
			toast.success("Deporte eliminado");
		} catch (err) {
			toast.error("No se pudo eliminar el deporte", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Deportes</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear deporte</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Field
						label="ID (slug)"
						htmlFor="sport-id"
						className="w-32"
						error={errors.id}
					>
						<Input
							id="sport-id"
							value={id}
							onChange={(e) => setId(e.target.value)}
							placeholder="football"
						/>
					</Field>
					<Field
						label="Nombre"
						htmlFor="sport-name"
						className="flex-1 min-w-40"
						error={errors.name}
					>
						<Input
							id="sport-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Fútbol"
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
				itemOne="deporte"
				itemMany="deportes"
				onPage={(p) => setAdminSearch({ page: p })}
				onOrder={(o) => setAdminSearch({ order: o, page: undefined })}
				onQuery={(qq) => setAdminSearch({ q: qq, page: undefined })}
				hasSearch
			/>
			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : sports.length === 0 ? (
				search.q ? (
					<EmptyState
						icon={Dumbbell}
						title={`Nada coincide con «${search.q}»`}
						description="Prueba con otro nombre o borra la búsqueda."
					/>
				) : (
					<EmptyState
						icon={Dumbbell}
						title="No hay deportes"
						description="Crea el primer deporte con el formulario de arriba."
					/>
				)
			) : (
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{sports.map((s) => (
						<Card key={s.id} className="p-4 flex flex-col">
							<Link
								to="/admin/sports/$sportId"
								params={{ sportId: s.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="flex items-center gap-2 text-base">
										<Dumbbell
											{...DECORATIVE}
											className="size-4 shrink-0 text-(--sea-ink-soft)"
										/>
										{s.name}
									</CardTitle>
								</CardHeader>
								<Badge variant="outline">{s.id}</Badge>
								{s.hasDraws !== undefined && (
									<Badge
										className="ml-2"
										variant={s.hasDraws ? "success" : "secondary"}
									>
										{s.hasDraws ? "empates" : "sin empates"}
									</Badge>
								)}
							</Link>
							<Button
								variant="destructive"
								size="icon-sm"
								icon={Trash2}
								aria-label="Eliminar"
								title="Eliminar"
								className="mt-2 self-start"
								onClick={() => onDelete(s.id, s.name)}
							/>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

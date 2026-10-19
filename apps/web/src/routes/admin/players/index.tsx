import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreatePlayer,
	useDeletePlayer,
	usePlayers,
} from "@sports/api-client/hooks";
import {
	Button,
	Card,
	CardHeader,
	CardTitle,
	EmptyState,
	Field,
	Input,
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

export const Route = createFileRoute("/admin/players/")({
	component: AdminPlayersPage,
});

function AdminPlayersPage() {
	const navigate = useNavigate();
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/players",
			search: { ...search, ...patch },
		});
	};
	const search = Route.useSearch() as AdminListSearch;
	const { data: playersData, isPending } = usePlayers(
		api,
		adminListFilters(search),
	);
	const create = useCreatePlayer(api);
	const del = useDeletePlayer(api);
	const confirm = useConfirm();
	const envelope = playersData as
		| {
				items: Array<{
					id: string;
					firstName: string;
					lastName: string;
					idCardNumber?: string | null;
				}>;
				total: number;
		  }
		| undefined;
	const players = envelope?.items ?? [];
	const total = envelope?.total ?? 0;
	const [firstName, setFirstName] = React.useState("");
	const [lastName, setLastName] = React.useState("");
	const [idCardNumber, setIdCardNumber] = React.useState("");
	const [errors, setErrors] = React.useState<Record<string, string | null>>({});

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		const nextErrors: Record<string, string | null> = {};
		if (!firstName.trim()) nextErrors.firstName = "El nombre es obligatorio.";
		if (!lastName.trim()) nextErrors.lastName = "El apellido es obligatorio.";
		if (Object.keys(nextErrors).length) {
			setErrors(nextErrors);
			return;
		}
		try {
			await create.mutateAsync({
				firstName,
				lastName,
				idCardNumber: idCardNumber || null,
			} as never);
			setFirstName("");
			setLastName("");
			setIdCardNumber("");
			setErrors({});
			toast.success("Jugador creado");
		} catch (err) {
			setErrors({ lastName: getApiErrorMessage(err) });
			toast.error("No se pudo crear el jugador", getApiErrorMessage(err));
		}
	};

	const onDelete = async (id: string, name: string) => {
		const ok = await confirm({
			title: "Eliminar jugador",
			description: `Se elimina la ficha de «${name}». No se puede deshacer.`,
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await del.mutateAsync(id);
			toast.success("Jugador eliminado");
		} catch (err) {
			toast.error("No se pudo eliminar el jugador", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Jugadores</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear jugador</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<Field
						label="Nombre"
						htmlFor="player-first-name"
						className="flex-1 min-w-32"
						error={errors.firstName}
					>
						<Input
							id="player-first-name"
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							placeholder="Lucía"
						/>
					</Field>
					<Field
						label="Apellido"
						htmlFor="player-last-name"
						className="flex-1 min-w-32"
						error={errors.lastName}
					>
						<Input
							id="player-last-name"
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							placeholder="García"
						/>
					</Field>
					<Field
						label="DNI (opcional)"
						htmlFor="player-id-card"
						className="flex-1 min-w-32"
					>
						<Input
							id="player-id-card"
							value={idCardNumber}
							onChange={(e) => setIdCardNumber(e.target.value)}
							placeholder="71234567"
						/>
					</Field>
					<Button
						type="submit"
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
				itemOne="jugador"
				itemMany="jugadores"
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
			) : players.length === 0 ? (
				search.q ? (
					<EmptyState
						title={`Nada coincide con «${search.q}»`}
						description="Busca por apellido o nombre, o borra la búsqueda."
					/>
				) : (
					<EmptyState
						title="No hay jugadores"
						description="Crea el primer jugador con el formulario de arriba."
					/>
				)
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{players.map((p) => (
						<Card key={p.id} className="p-4 flex flex-col">
							<Link
								to="/admin/players/$playerId"
								params={{ playerId: p.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="text-base">
										{p.firstName} {p.lastName}
									</CardTitle>
								</CardHeader>
								<div className="text-xs text-(--sea-ink-soft)">
									{p.idCardNumber ?? "—"}
								</div>
							</Link>
							<Button
								variant="ghost"
								size="sm"
								className="mt-2 self-start"
								onClick={() => onDelete(p.id, `${p.firstName} ${p.lastName}`)}
							>
								Eliminar
							</Button>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

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
	Input,
	Skeleton,
	toast,
	useConfirm,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/players/")({
	component: AdminPlayersPage,
});

function AdminPlayersPage() {
	const { data: playersData, isPending } = usePlayers(api);
	const create = useCreatePlayer(api);
	const del = useDeletePlayer(api);
	const confirm = useConfirm();
	const players =
		(
			playersData as
				| {
						items: Array<{
							id: string;
							firstName: string;
							lastName: string;
							idCardNumber?: string | null;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const [firstName, setFirstName] = React.useState("");
	const [lastName, setLastName] = React.useState("");
	const [idCardNumber, setIdCardNumber] = React.useState("");

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await create.mutateAsync({
				firstName,
				lastName,
				idCardNumber: idCardNumber || null,
			} as never);
			setFirstName("");
			setLastName("");
			setIdCardNumber("");
			toast.success("Jugador creado");
		} catch (err) {
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
					<Input
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						placeholder="Nombre"
						required
						className="flex-1 min-w-32"
					/>
					<Input
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
						placeholder="Apellido"
						required
						className="flex-1 min-w-32"
					/>
					<Input
						value={idCardNumber}
						onChange={(e) => setIdCardNumber(e.target.value)}
						placeholder="DNI (opcional)"
						className="flex-1 min-w-32"
					/>
					<Button type="submit" disabled={create.isPending}>
						Crear
					</Button>
				</form>
			</Card>
			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : players.length === 0 ? (
				<EmptyState
					title="No hay jugadores"
					description="Crea el primer jugador con el formulario de arriba."
				/>
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

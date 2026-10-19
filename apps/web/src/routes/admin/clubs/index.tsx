import { getApiErrorMessage } from "@sports/api-client";
import {
	useClubs,
	useCreateClub,
	useDeleteClub,
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

export const Route = createFileRoute("/admin/clubs/")({
	component: AdminClubsPage,
});

function AdminClubsPage() {
	const { data: clubsData, isPending } = useClubs(api);
	const create = useCreateClub(api);
	const del = useDeleteClub(api);
	const confirm = useConfirm();
	const clubs =
		(
			clubsData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];
	const [name, setName] = React.useState("");

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await create.mutateAsync({ name } as never);
			setName("");
			toast.success("Club creado", `«${name.trim()}» está listo en la lista.`);
		} catch (err) {
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
			<Card className="p-4">
				<h3 className="font-bold">Crear club</h3>
				<form onSubmit={onCreate} className="mt-2 flex gap-2">
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Club Atlético"
						required
						className="flex-1"
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
			) : clubs.length === 0 ? (
				<EmptyState
					title="No hay clubes"
					description="Crea el primer club con el formulario de arriba."
				/>
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
									<CardTitle className="text-base">{c.name}</CardTitle>
								</CardHeader>
							</Link>
							<Button
								variant="ghost"
								size="sm"
								className="mt-2 self-start"
								onClick={() => onDelete(c.id, c.name)}
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

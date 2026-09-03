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
	Input,
	Label,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/venues/")({
	component: AdminVenuesPage,
});

function AdminVenuesPage() {
	const { data: venuesData } = useVenues(api);
	const create = useCreateVenue(api);
	const del = useDeleteVenue(api);
	const venues =
		(
			venuesData as
				| {
						items: Array<{
							id: string;
							name: string;
							address?: string | null;
							fieldCount?: number | null;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const [name, setName] = React.useState("");
	const [address, setAddress] = React.useState("");
	const [fieldCount, setFieldCount] = React.useState(1);
	const [error, setError] = React.useState<string | null>(null);

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await create.mutateAsync({
				name,
				address: address || null,
				fieldCount,
			} as never);
			setName("");
			setAddress("");
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Sedes</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear sede</h3>
				<form onSubmit={onCreate} className="mt-3 flex flex-wrap gap-2">
					<div className="flex-1 min-w-40">
						<Label>Nombre</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							placeholder="Estadio Municipal"
						/>
					</div>
					<div className="flex-1 min-w-40">
						<Label>Dirección</Label>
						<Input
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="Av. Principal 123"
						/>
					</div>
					<div className="w-24">
						<Label>Canchas</Label>
						<Input
							type="number"
							value={fieldCount}
							onChange={(e) => setFieldCount(Number(e.target.value))}
							min={1}
						/>
					</div>
					<div className="flex items-end">
						<Button type="submit" disabled={create.isPending}>
							Crear
						</Button>
					</div>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
			</Card>
			<div className="grid gap-3 sm:grid-cols-2">
				{venues.map((v) => (
					<Card key={v.id} className="p-4 flex flex-col">
						<Link
							to="/admin/venues/$venueId"
							params={{ venueId: v.id }}
							className="no-underline"
						>
							<CardHeader className="p-0">
								<CardTitle className="text-base">{v.name}</CardTitle>
							</CardHeader>
							<div className="text-sm text-(--sea-ink-soft)">
								{v.address ?? "Sin dirección"} · {v.fieldCount ?? 1} canchas
							</div>
						</Link>
						<Button
							variant="ghost"
							size="sm"
							className="mt-2 self-start"
							onClick={async () => {
								if (!confirm(`¿Eliminar sede ${v.name}?`)) return;
								try {
									await del.mutateAsync(v.id);
								} catch (err) {
									setError(getApiErrorMessage(err));
								}
							}}
						>
							Eliminar
						</Button>
					</Card>
				))}
			</div>
			{venues.length === 0 && (
				<div className="demo-card text-center text-sm">No hay sedes</div>
			)}
		</div>
	);
}

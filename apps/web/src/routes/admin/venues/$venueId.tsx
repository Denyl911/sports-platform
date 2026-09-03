import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import { useUpdateVenue } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label } from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/venues/$venueId")({
	component: AdminVenueDetailPage,
});

function AdminVenueDetailPage() {
	const { venueId } = Route.useParams();
	const { data } = useQuery({
		queryKey: queryKeys.venues.detail(venueId),
		queryFn: () => unwrap(api.venues({ id: venueId }).get()),
	});
	const venue = data as
		| {
				id: string;
				name: string;
				address?: string | null;
				fieldCount?: number | null;
		  }
		| undefined;
	const update = useUpdateVenue(api);
	const [name, setName] = React.useState("");
	const [address, setAddress] = React.useState("");
	const [fieldCount, setFieldCount] = React.useState(1);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (venue) {
			setName(venue.name);
			setAddress(venue.address ?? "");
			setFieldCount(venue.fieldCount ?? 1);
		}
	}, [venue]);

	if (!venue) return <div className="demo-center text-sm">Cargando sede…</div>;

	const onUpdate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await update.mutateAsync({
				id: venueId,
				body: { name, address: address || null, fieldCount } as never,
			});
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/venues" className="text-sm text-(--sea-ink-soft)">
				← Sedes
			</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>Editar sede</CardTitle>
				</CardHeader>
				<form onSubmit={onUpdate} className="space-y-3">
					<div>
						<Label>Nombre</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Dirección</Label>
						<Input
							value={address}
							onChange={(e) => setAddress(e.target.value)}
						/>
					</div>
					<div>
						<Label>Canchas</Label>
						<Input
							type="number"
							value={fieldCount}
							onChange={(e) => setFieldCount(Number(e.target.value))}
						/>
					</div>
					<Button type="submit" disabled={update.isPending}>
						Guardar
					</Button>
					{error && <div className="demo-alert-danger text-sm">{error}</div>}
					{update.isSuccess && (
						<div className="demo-alert text-sm">Guardado</div>
					)}
				</form>
			</Card>
		</div>
	);
}

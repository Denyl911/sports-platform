import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import { useUpdateVenue } from "@sports/api-client/hooks";
import {
	Button,
	Card,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Save,
	Skeleton,
	toast,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { AdminBreadcrumbs } from "../../../components/AdminBreadcrumbs";
import { VenueMap } from "../../../components/VenueMap";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/venues/$venueId")({
	component: AdminVenueDetailPage,
});

function AdminVenueDetailPage() {
	const { venueId } = Route.useParams();
	const { data, isPending } = useQuery({
		queryKey: queryKeys.venues.detail(venueId),
		queryFn: () => unwrap(api.venues({ id: venueId }).get()),
	});
	const venue = data as
		| {
				id: string;
				name: string;
				address?: string | null;
				fieldCount?: number | null;
				latitude?: number | null;
				longitude?: number | null;
		  }
		| undefined;
	const update = useUpdateVenue(api);
	const [name, setName] = React.useState("");
	const [address, setAddress] = React.useState("");
	const [fieldCount, setFieldCount] = React.useState(1);
	const [latitude, setLatitude] = React.useState<number | null>(null);
	const [longitude, setLongitude] = React.useState<number | null>(null);

	React.useEffect(() => {
		if (venue) {
			setName(venue.name);
			setAddress(venue.address ?? "");
			setFieldCount(venue.fieldCount ?? 1);
			setLatitude(venue.latitude ?? null);
			setLongitude(venue.longitude ?? null);
		}
	}, [venue]);

	if (isPending) return <Skeleton className="h-64 rounded-xl" />;

	if (!venue) return <Skeleton className="h-64 rounded-xl" />;

	const onUpdate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await update.mutateAsync({
				id: venueId,
				body: {
					name,
					address: address || null,
					fieldCount,
					latitude,
					longitude,
				} as never,
			});
			toast.success("Sede guardada");
		} catch (err) {
			toast.error("No se pudo guardar la sede", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<AdminBreadcrumbs
				pieces={[
					{ label: "Admin", to: "/admin" },
					{ label: "Sedes", to: "/admin/venues" },
					{ label: venue.name },
				]}
			/>
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
						<Label>Ubicación</Label>
						<VenueMap
							latitude={latitude}
							longitude={longitude}
							name={venue.name}
							onLocationSelect={(lat, lng) => {
								setLatitude(lat);
								setLongitude(lng);
							}}
							height="250px"
						/>
						<p className="text-xs text-(--sea-ink-soft)">
							{latitude && longitude
								? `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
								: "Haz clic en el mapa para seleccionar la ubicación"}
						</p>
					</div>
					<div>
						<Label>Canchas</Label>
						<Input
							type="number"
							value={fieldCount}
							onChange={(e) => setFieldCount(Number(e.target.value))}
						/>
					</div>
					<Button type="submit" icon={Save} disabled={update.isPending}>
						Guardar
					</Button>
				</form>
			</Card>
		</div>
	);
}

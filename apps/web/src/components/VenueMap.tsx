import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in Leaflet with bundlers
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
	iconUrl,
	iconRetinaUrl,
	shadowUrl,
});

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
	useMapEvents({
		click: (e) => {
			onLocationSelect(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

export function VenueMap({
	latitude,
	longitude,
	name,
	onLocationSelect,
	height = "300px",
}: {
	latitude?: number | null;
	longitude?: number | null;
	name?: string;
	onLocationSelect?: (lat: number, lng: number) => void;
	height?: string;
}) {
	const defaultCenter: [number, number] = [-34.6037, -58.3816]; // Buenos Aires
	const center: [number, number] = latitude && longitude ? [latitude, longitude] : defaultCenter;

	return (
		<div style={{ height }} className="w-full overflow-hidden rounded-xl border border-(--line)">
			<MapContainer
				center={center}
				zoom={latitude && longitude ? 15 : 10}
				style={{ height: "100%", width: "100%" }}
				scrollWheelZoom={true}
			>
				{onLocationSelect && <MapClickHandler onLocationSelect={onLocationSelect} />}
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				{latitude && longitude && (
					<Marker position={[latitude, longitude]}>
						<Popup>{name || "Ubicación"}</Popup>
					</Marker>
				)}
			</MapContainer>
		</div>
	);
}

import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import { useUpdatePlayer } from "@sports/api-client/hooks";
import {
	Button,
	Card,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Skeleton,
	toast,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/players/$playerId")({
	component: AdminPlayerDetailPage,
});

function AdminPlayerDetailPage() {
	const { playerId } = Route.useParams();
	const { data, isPending } = useQuery({
		queryKey: queryKeys.players.detail(playerId),
		queryFn: () => unwrap(api.players({ id: playerId }).get()),
	});
	const player = data as
		| {
				id: string;
				firstName: string;
				lastName: string;
				idCardNumber?: string | null;
				birthDate?: string | null;
		  }
		| undefined;
	const update = useUpdatePlayer(api);
	const [firstName, setFirstName] = React.useState("");
	const [lastName, setLastName] = React.useState("");
	const [idCardNumber, setIdCardNumber] = React.useState("");
	React.useEffect(() => {
		if (player) {
			setFirstName(player.firstName);
			setLastName(player.lastName);
			setIdCardNumber(player.idCardNumber ?? "");
		}
	}, [player]);
	if (isPending)
		return (
			<div className="space-y-6">
				<Skeleton className="h-48 rounded-xl" />
			</div>
		);
	if (!player) return <Skeleton className="h-64 rounded-xl" />;
	const onUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await update.mutateAsync({
				id: playerId,
				body: {
					firstName,
					lastName,
					idCardNumber: idCardNumber || null,
				} as never,
			});
			toast.success("Cambios guardados");
		} catch (err) {
			toast.error("No se pudo guardar el jugador", getApiErrorMessage(err));
		}
	};
	return (
		<div className="space-y-6">
			<Link to="/admin/players" className="text-sm text-(--sea-ink-soft)">
				← Jugadores
			</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>Editar jugador</CardTitle>
				</CardHeader>
				<form onSubmit={onUpdate} className="space-y-3">
					<div>
						<Label>Nombre</Label>
						<Input
							value={firstName}
							onChange={(e) => setFirstName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Apellido</Label>
						<Input
							value={lastName}
							onChange={(e) => setLastName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>DNI</Label>
						<Input
							value={idCardNumber}
							onChange={(e) => setIdCardNumber(e.target.value)}
						/>
					</div>
					<Button type="submit" disabled={update.isPending}>
						Guardar
					</Button>
				</form>
			</Card>
		</div>
	);
}

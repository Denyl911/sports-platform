import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import { useUpdatePlayer } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label } from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/players/$playerId")({
	component: AdminPlayerDetailPage,
});

function AdminPlayerDetailPage() {
	const { playerId } = Route.useParams();
	const { data } = useQuery({
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
	const [error, setError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (player) {
			setFirstName(player.firstName);
			setLastName(player.lastName);
			setIdCardNumber(player.idCardNumber ?? "");
		}
	}, [player]);
	if (!player)
		return <div className="demo-center text-sm">Cargando jugador…</div>;
	const onUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await update.mutateAsync({
				id: playerId,
				body: {
					firstName,
					lastName,
					idCardNumber: idCardNumber || null,
				} as never,
			});
		} catch (err) {
			setError(getApiErrorMessage(err));
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
					{error && <div className="demo-alert-danger text-sm">{error}</div>}
					{update.isSuccess && (
						<div className="demo-alert text-sm">Guardado</div>
					)}
				</form>
			</Card>
		</div>
	);
}

import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import { useUpdateClub } from "@sports/api-client/hooks";
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

export const Route = createFileRoute("/admin/clubs/$clubId")({
	component: AdminClubDetailPage,
});

function AdminClubDetailPage() {
	const { clubId } = Route.useParams();
	const { data } = useQuery({
		queryKey: queryKeys.clubs.detail(clubId),
		queryFn: () => unwrap(api.clubs({ id: clubId }).get()),
	});
	const club = data as { id: string; name: string } | undefined;
	const update = useUpdateClub(api);
	const [name, setName] = React.useState("");

	React.useEffect(() => {
		if (club) setName(club.name);
	}, [club]);
	if (!club) return <Skeleton className="h-64 rounded-xl" />;

	const onUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await update.mutateAsync({ id: clubId, body: { name } as never });
			toast.success("Club guardado");
		} catch (err) {
			toast.error("No se pudo guardar el club", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/clubs" className="text-sm text-(--sea-ink-soft)">
				← Clubes
			</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>Editar club</CardTitle>
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
					<Button type="submit" disabled={update.isPending}>
						Guardar
					</Button>
				</form>
			</Card>
		</div>
	);
}

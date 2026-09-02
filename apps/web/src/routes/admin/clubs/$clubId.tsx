// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { queryKeys, getApiErrorMessage } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { useUpdateClub } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label } from "@sports/ui";
import * as React from "react";

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
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => { if (club) setName(club.name); }, [club]);
	if (!club) return <div className="demo-center text-sm">Cargando club…</div>;

	const onUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try { await update.mutateAsync({ id: clubId, body: { name } as never }); } catch (err) { setError(getApiErrorMessage(err)); }
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/clubs" className="text-sm text-[var(--sea-ink-soft)]">← Clubes</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2"><CardTitle>Editar club</CardTitle></CardHeader>
				<form onSubmit={onUpdate} className="space-y-3">
					<div><Label>Nombre</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
					<Button type="submit" disabled={update.isPending}>Guardar</Button>
					{error && <div className="demo-alert-danger text-sm">{error}</div>}
					{update.isSuccess && <div className="demo-alert text-sm">Guardado</div>}
				</form>
			</Card>
		</div>
	);
}

// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../lib/api";
import { queryKeys, getApiErrorMessage } from "@sports/api-client";
import { unwrap } from "@sports/api-client";
import { useUpdateUser, useAddTournamentMember } from "@sports/api-client/hooks";
import { useTournaments } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label, Select, Badge } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/users/$userId")({
	component: AdminUserDetailPage,
});

function AdminUserDetailPage() {
	const { userId } = Route.useParams();
	const { data } = useQuery({ queryKey: queryKeys.users.detail(userId), queryFn: () => unwrap(api.users({ userId }).get()) });
	const user = data as { id: string; email: string; fullName: string; role: string; isActive: boolean } | undefined;
	const update = useUpdateUser(api);
	const addMember = useAddTournamentMember(api);
	const { data: tournamentsData } = useTournaments(api);
	const tournaments = (tournamentsData as { items: Array<{ id: string; name: string }>; total: number } | undefined)?.items ?? [];

	const [fullName, setFullName] = React.useState("");
	const [role, setRole] = React.useState("viewer_staff");
	const [tournamentId, setTournamentId] = React.useState("");
	const [memberRole, setMemberRole] = React.useState("organizer");
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (user) { setFullName(user.fullName); setRole(user.role); }
	}, [user]);
	React.useEffect(() => { if (tournaments.length && !tournamentId) setTournamentId(tournaments[0]!.id); }, [tournaments, tournamentId]);

	if (!user) return <div className="demo-center text-sm">Cargando usuario…</div>;

	const onUpdate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try { await update.mutateAsync({ userId, body: { fullName, role } as never }); } catch (err) { setError(getApiErrorMessage(err)); }
	};

	const onAddMembership = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try { await addMember.mutateAsync({ userId, body: { tournamentId, role: memberRole } as never }); } catch (err) { setError(getApiErrorMessage(err)); }
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/users" className="text-sm text-[var(--sea-ink-soft)]">← Usuarios</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2"><CardTitle>{user.fullName}</CardTitle></CardHeader>
				<div className="text-sm text-[var(--sea-ink-soft)]">{user.email} · {user.id.slice(0, 8)}</div>
				<form onSubmit={onUpdate} className="mt-3 space-y-3">
					<div><Label>Nombre</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
					<div><Label>Rol global</Label><Select value={role} onChange={(e) => setRole(e.target.value)}><option value="viewer_staff">viewer_staff</option><option value="organizer">organizer</option><option value="referee">referee</option><option value="statistician">statistician</option><option value="admin">admin</option><option value="super_admin">super_admin</option></Select></div>
					<Button type="submit" disabled={update.isPending}>Guardar</Button>
					{error && <div className="demo-alert-danger text-sm">{error}</div>}
					{update.isSuccess && <div className="demo-alert text-sm">Guardado</div>}
				</form>
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Membresía en torneo (asignar referee/statistician)</h3>
				<p className="text-sm text-[var(--sea-ink-soft)]">Requiere organizer del torneo. El backend valida 409 si ya es miembro.</p>
				<form onSubmit={onAddMembership} className="mt-3 flex flex-wrap gap-2">
					<Select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} className="flex-1 min-w-40">
						{tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
					</Select>
					<Select value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className="w-40">
						<option value="organizer">organizer</option>
						<option value="referee">referee</option>
						<option value="statistician">statistician</option>
						<option value="viewer_staff">viewer_staff</option>
					</Select>
					<Button type="submit" disabled={addMember.isPending}>Asignar</Button>
				</form>
				{addMember.isError && <div className="demo-alert-danger mt-2 text-sm">{getApiErrorMessage(addMember.error)}</div>}
				{addMember.isSuccess && <div className="demo-alert mt-2 text-sm">Membresía asignada</div>}
			</Card>
		</div>
	);
}

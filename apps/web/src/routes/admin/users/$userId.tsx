import { getApiErrorMessage, queryKeys, unwrap } from "@sports/api-client";
import {
	useAddTournamentMember,
	useMembershipsByUser,
	useRemoveMembership,
	useTournaments,
	useUpdateMembershipRole,
	useUpdateUser,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	Input,
	Label,
	Select,
} from "@sports/ui";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/users/$userId")({
	component: AdminUserDetailPage,
});

type GlobalRole =
	| "super_admin"
	| "admin"
	| "organizer"
	| "referee"
	| "statistician"
	| "viewer_staff";
type MemberRole = "organizer" | "referee" | "statistician" | "viewer_staff";

function AdminUserDetailPage() {
	const { userId } = Route.useParams();
	const { data } = useQuery({
		queryKey: queryKeys.users.detail(userId),
		queryFn: () => unwrap(api.users({ userId }).get()),
	});
	const user = data as
		| {
				id: string;
				email: string;
				fullName: string;
				role: string;
				isActive: boolean;
		  }
		| undefined;
	const update = useUpdateUser(api);
	const addMember = useAddTournamentMember(api);
	const { data: tournamentsData } = useTournaments(api);
	const tournaments =
		(
			tournamentsData as
				| { items: Array<{ id: string; name: string }>; total: number }
				| undefined
		)?.items ?? [];

	const [fullName, setFullName] = React.useState("");
	const [role, setRole] = React.useState<GlobalRole>("viewer_staff");
	const [tournamentId, setTournamentId] = React.useState("");
	const [memberRole, setMemberRole] = React.useState<MemberRole>("organizer");
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (user) {
			setFullName(user.fullName);
			setRole(user.role as GlobalRole);
		}
	}, [user]);
	React.useEffect(() => {
		if (tournaments.length && !tournamentId)
			setTournamentId(tournaments[0]!.id);
	}, [tournaments, tournamentId]);

	if (!user)
		return <div className="demo-center text-sm">Cargando usuario…</div>;

	const onUpdate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await update.mutateAsync({ userId, body: { fullName, role } });
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	const onAddMembership = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		try {
			await addMember.mutateAsync({
				userId,
				body: { tournamentId, userId, role: memberRole },
			});
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<Link to="/admin/users" className="text-sm text-(--sea-ink-soft)">
				← Usuarios
			</Link>
			<Card className="p-4">
				<CardHeader className="p-0 pb-2">
					<CardTitle>{user.fullName}</CardTitle>
				</CardHeader>
				<div className="text-sm text-(--sea-ink-soft)">
					{user.email} · {user.id.slice(0, 8)}
				</div>
				<form onSubmit={onUpdate} className="mt-3 space-y-3">
					<div>
						<Label>Nombre</Label>
						<Input
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Rol global</Label>
						<Select
							value={role}
							onChange={(e) => setRole(e.target.value as GlobalRole)}
						>
							<option value="viewer_staff">viewer_staff</option>
							<option value="organizer">organizer</option>
							<option value="referee">referee</option>
							<option value="statistician">statistician</option>
							<option value="admin">admin</option>
							<option value="super_admin">super_admin</option>
						</Select>
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

			<Card className="p-4">
				<h3 className="font-bold">
					Membresía en torneo (asignar referee/statistician)
				</h3>
				<p className="text-sm text-(--sea-ink-soft)">
					Requiere organizer del torneo. El backend valida 409 si ya es miembro.
				</p>
				<form onSubmit={onAddMembership} className="mt-3 flex flex-wrap gap-2">
					<Select
						value={tournamentId}
						onChange={(e) => setTournamentId(e.target.value)}
						className="flex-1 min-w-40"
					>
						{tournaments.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</Select>
					<Select
						value={memberRole}
						onChange={(e) => setMemberRole(e.target.value as MemberRole)}
						className="w-40"
					>
						<option value="organizer">organizer</option>
						<option value="referee">referee</option>
						<option value="statistician">statistician</option>
						<option value="viewer_staff">viewer_staff</option>
					</Select>
					<Button type="submit" disabled={addMember.isPending}>
						Asignar
					</Button>
				</form>
				{addMember.isError && (
					<div className="demo-alert-danger mt-2 text-sm">
						{getApiErrorMessage(addMember.error)}
					</div>
				)}
				{addMember.isSuccess && (
					<div className="demo-alert mt-2 text-sm">Membresía asignada</div>
				)}
			</Card>

			<Card className="p-4">
				<h3 className="font-bold">Membresías actuales</h3>
				<UserMemberships userId={userId} />
			</Card>
		</div>
	);
}

function UserMemberships({ userId }: { userId: string }) {
	const { data: membershipsData } = useMembershipsByUser(api, userId);
	const memberships =
		(
			membershipsData as
				| {
						items: Array<{
							membership: { id: string; tournamentId: string; role: string };
							tournament: { id: string; name: string };
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];

	if (memberships.length === 0) {
		return (
			<div className="mt-2 text-sm text-(--sea-ink-soft)">Sin membresías</div>
		);
	}

	return (
		<div className="mt-3 space-y-1">
			{memberships.map(({ membership, tournament }) => (
				<MembershipRow
					key={membership.id}
					membership={membership}
					tournamentName={tournament.name}
				/>
			))}
		</div>
	);
}

function MembershipRow({
	membership,
	tournamentName,
}: {
	membership: { id: string; tournamentId: string; role: string };
	tournamentName: string;
}) {
	const updateRole = useUpdateMembershipRole(api);
	const remove = useRemoveMembership(api);
	const [role, setRole] = React.useState<MemberRole>(
		membership.role as MemberRole,
	);
	const [error, setError] = React.useState<string | null>(null);

	const onSave = async () => {
		setError(null);
		try {
			await updateRole.mutateAsync({
				memberId: membership.id,
				body: { role },
			});
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	const onRemove = async () => {
		if (!confirm(`¿Quitar membresía en ${tournamentName}?`)) return;
		setError(null);
		try {
			await remove.mutateAsync(membership.id);
		} catch (err) {
			setError(getApiErrorMessage(err));
		}
	};

	return (
		<div className="demo-list-item flex flex-wrap items-center justify-between gap-2 text-sm">
			<span className="flex items-center gap-2">
				<span>{tournamentName}</span>
				<Badge variant="secondary">{membership.role}</Badge>
			</span>
			<div className="flex items-center gap-2">
				<Select
					value={role}
					onChange={(e) => setRole(e.target.value as MemberRole)}
					className="w-36"
				>
					<option value="organizer">organizer</option>
					<option value="referee">referee</option>
					<option value="statistician">statistician</option>
					<option value="viewer_staff">viewer_staff</option>
				</Select>
				<Button variant="ghost" size="sm" onClick={onSave}>
					Guardar
				</Button>
				<Button variant="destructive" size="sm" onClick={onRemove}>
					Quitar
				</Button>
			</div>
			{error && <div className="demo-alert-danger w-full text-xs">{error}</div>}
		</div>
	);
}

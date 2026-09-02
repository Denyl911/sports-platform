// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "../../../lib/api";
import { getApiErrorMessage } from "@sports/api-client";
import { useUsers, useCreateUser, useDeleteUser } from "@sports/api-client/hooks";
import { Button, Card, CardHeader, CardTitle, Input, Label, Select, Badge } from "@sports/ui";
import * as React from "react";

export const Route = createFileRoute("/admin/users/")({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const { data: usersData } = useUsers(api);
	const create = useCreateUser(api);
	const del = useDeleteUser(api);
	const users = (usersData as { items: Array<{ id: string; email: string; fullName: string; role: string; isActive: boolean }>; total: number } | undefined)?.items ?? [];
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [fullName, setFullName] = React.useState("");
	const [role, setRole] = React.useState("viewer_staff");
	const [error, setError] = React.useState<string | null>(null);

	const onCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		try { await create.mutateAsync({ email, password, fullName, role } as never); setEmail(""); setPassword(""); setFullName(""); } catch (err) { setError(getApiErrorMessage(err)); }
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Usuarios</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear usuario (admin)</h3>
				<form onSubmit={onCreate} className="mt-3 grid gap-2 sm:grid-cols-2">
					<div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
					<div><Label>Contraseña</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
					<div><Label>Nombre</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
					<div><Label>Rol</Label><Select value={role} onChange={(e) => setRole(e.target.value)}><option value="viewer_staff">viewer_staff</option><option value="organizer">organizer</option><option value="referee">referee</option><option value="statistician">statistician</option><option value="admin">admin</option><option value="super_admin">super_admin</option></Select></div>
					<div className="sm:col-span-2"><Button type="submit" disabled={create.isPending}>Crear</Button></div>
				</form>
				{error && <div className="demo-alert-danger mt-2 text-sm">{error}</div>}
			</Card>
			<div className="grid gap-3 sm:grid-cols-2">
				{users.map((u) => (
					<Card key={u.id} className="p-4 flex flex-col">
						<Link to="/admin/users/$userId" params={{ userId: u.id }} className="no-underline">
							<CardHeader className="p-0"><CardTitle className="text-base">{u.fullName}</CardTitle></CardHeader>
							<div className="text-sm text-[var(--sea-ink-soft)]">{u.email}</div>
							<Badge variant={u.isActive ? "success" : "destructive"} className="mt-1">{u.role} {u.isActive ? "" : "(inactivo)"}</Badge>
						</Link>
						<Button variant="ghost" size="sm" className="mt-2 self-start" onClick={async () => {
							if (!confirm(`¿Eliminar usuario ${u.fullName}?`)) return;
							try { await del.mutateAsync(u.id); } catch (err) { setError(getApiErrorMessage(err)); }
						}}>Eliminar</Button>
					</Card>
				))}
			</div>
			{users.length === 0 && <div className="demo-card text-center text-sm">No hay usuarios</div>}
		</div>
	);
}

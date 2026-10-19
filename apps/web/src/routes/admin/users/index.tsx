import { getApiErrorMessage } from "@sports/api-client";
import {
	useCreateUser,
	useDeleteUser,
	useUsers,
} from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CardHeader,
	CardTitle,
	EmptyState,
	Input,
	Label,
	Select,
	Skeleton,
	toast,
	useConfirm,
} from "@sports/ui";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/users/")({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const { data: usersData, isPending } = useUsers(api);
	const create = useCreateUser(api);
	const del = useDeleteUser(api);
	const confirm = useConfirm();
	const users =
		(
			usersData as
				| {
						items: Array<{
							id: string;
							email: string;
							fullName: string;
							role: string;
							isActive: boolean;
						}>;
						total: number;
				  }
				| undefined
		)?.items ?? [];
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [fullName, setFullName] = React.useState("");
	const [role, setRole] = React.useState("viewer_staff");

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		try {
			await create.mutateAsync({ email, password, fullName, role } as never);
			setEmail("");
			setPassword("");
			setFullName("");
			toast.success("Usuario creado");
		} catch (err) {
			toast.error("No se pudo crear el usuario", getApiErrorMessage(err));
		}
	};

	const onDelete = async (userId: string, name: string) => {
		const ok = await confirm({
			title: "Eliminar usuario",
			description: `Se elimina la cuenta de «${name}». No se puede deshacer.`,
			confirmLabel: "Eliminar",
		});
		if (!ok) return;
		try {
			await del.mutateAsync(userId);
			toast.success("Usuario eliminado");
		} catch (err) {
			toast.error("No se pudo eliminar el usuario", getApiErrorMessage(err));
		}
	};

	return (
		<div className="space-y-6">
			<h1 className="demo-title">Usuarios</h1>
			<Card className="p-4">
				<h3 className="font-bold">Crear usuario (admin)</h3>
				<form onSubmit={onCreate} className="mt-3 grid gap-2 sm:grid-cols-2">
					<div>
						<Label>Email</Label>
						<Input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Contraseña</Label>
						<Input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Nombre</Label>
						<Input
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							required
						/>
					</div>
					<div>
						<Label>Rol</Label>
						<Select value={role} onChange={(e) => setRole(e.target.value)}>
							<option value="viewer_staff">viewer_staff</option>
							<option value="organizer">organizer</option>
							<option value="referee">referee</option>
							<option value="statistician">statistician</option>
							<option value="admin">admin</option>
							<option value="super_admin">super_admin</option>
						</Select>
					</div>
					<div className="sm:col-span-2">
						<Button type="submit" disabled={create.isPending}>
							Crear
						</Button>
					</div>
				</form>
			</Card>
			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : users.length === 0 ? (
				<EmptyState
					title="No hay usuarios"
					description="Crea la primera cuenta con el formulario de arriba."
				/>
			) : (
				<div className="grid gap-3 sm:grid-cols-2">
					{users.map((u) => (
						<Card key={u.id} className="p-4 flex flex-col">
							<Link
								to="/admin/users/$userId"
								params={{ userId: u.id }}
								className="no-underline"
							>
								<CardHeader className="p-0">
									<CardTitle className="text-base">{u.fullName}</CardTitle>
								</CardHeader>
								<div className="text-sm text-(--sea-ink-soft)">{u.email}</div>
								<Badge
									variant={u.isActive ? "success" : "destructive"}
									className="mt-1"
								>
									{u.role} {u.isActive ? "" : "(inactivo)"}
								</Badge>
							</Link>
							<Button
								variant="ghost"
								size="sm"
								className="mt-2 self-start"
								onClick={() => onDelete(u.id, u.fullName)}
							>
								Eliminar
							</Button>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

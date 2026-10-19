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
	DECORATIVE,
	EmptyState,
	Field,
	Input,
	Plus,
	Select,
	Skeleton,
	Trash2,
	toast,
	UserCog,
	useConfirm,
} from "@sports/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { AdminListPager } from "../../../components/AdminListPager";
import {
	type AdminListSearch,
	adminListFilters,
} from "../../../lib/admin-list";
import { api } from "../../../lib/api";

export const Route = createFileRoute("/admin/users/")({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const navigate = useNavigate();
	const setAdminSearch = (patch: Partial<AdminListSearch>) => {
		navigate({
			to: "/admin/users",
			search: { ...search, ...patch },
		});
	};
	const search = Route.useSearch() as AdminListSearch;
	const { data: usersData, isPending } = useUsers(
		api,
		adminListFilters(search),
	);
	const create = useCreateUser(api);
	const del = useDeleteUser(api);
	const confirm = useConfirm();
	const envelope = usersData as
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
		| undefined;
	const users = envelope?.items ?? [];
	const total = envelope?.total ?? 0;
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [fullName, setFullName] = React.useState("");
	const [role, setRole] = React.useState("viewer_staff");
	const [errors, setErrors] = React.useState<Record<string, string | null>>({});

	const onCreate = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		const nextErrors: Record<string, string | null> = {
			email: email.trim() ? null : "El email es obligatorio.",
			password: password.trim() ? null : "La contraseña es obligatoria.",
			fullName: fullName.trim() ? null : "El nombre es obligatorio.",
		};
		if (nextErrors.email || nextErrors.password || nextErrors.fullName) {
			setErrors(nextErrors);
			return;
		}
		try {
			await create.mutateAsync({ email, password, fullName, role } as never);
			setEmail("");
			setPassword("");
			setFullName("");
			setErrors({});
			toast.success("Usuario creado");
		} catch (err) {
			setErrors({ email: getApiErrorMessage(err) });
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
				<form
					onSubmit={onCreate}
					className="mt-3 grid gap-2 sm:grid-cols-2"
					noValidate
				>
					<Field label="Email" htmlFor="user-email" error={errors.email}>
						<Input
							id="user-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</Field>
					<Field
						label="Contraseña"
						htmlFor="user-password"
						error={errors.password}
					>
						<Input
							id="user-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</Field>
					<Field
						label="Nombre"
						htmlFor="user-full-name"
						error={errors.fullName}
					>
						<Input
							id="user-full-name"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
						/>
					</Field>
					<div>
						<label
							htmlFor="user-role"
							className="text-sm font-semibold leading-none text-(--sea-ink)"
						>
							Rol
						</label>
						<Select
							id="user-role"
							value={role}
							onChange={(e) => setRole(e.target.value)}
						>
							<option value="viewer_staff">viewer_staff</option>
							<option value="organizer">organizer</option>
							<option value="referee">referee</option>
							<option value="statistician">statistician</option>
							<option value="admin">admin</option>
							<option value="super_admin">super_admin</option>
						</Select>
					</div>
					<div className="sm:col-span-2">
						<Button type="submit" icon={Plus} disabled={create.isPending}>
							Crear
						</Button>
					</div>
				</form>
			</Card>
			<AdminListPager
				search={search}
				total={total}
				itemOne="usuario"
				itemMany="usuarios"
				onPage={(p) => setAdminSearch({ page: p })}
				onOrder={(o) => setAdminSearch({ order: o, page: undefined })}
				onQuery={(qq) => setAdminSearch({ q: qq, page: undefined })}
				hasOrder={false}
			/>
			{isPending ? (
				<div className="grid gap-3 sm:grid-cols-2">
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
					<Skeleton className="h-28 rounded-xl" />
				</div>
			) : users.length === 0 ? (
				<EmptyState
					icon={UserCog}
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
									<CardTitle className="flex items-center gap-2 text-base">
										<UserCog
											{...DECORATIVE}
											className="size-4 shrink-0 text-(--sea-ink-soft)"
										/>
										{u.fullName}
									</CardTitle>
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
								variant="destructive"
								size="icon-sm"
								icon={Trash2}
								aria-label="Eliminar"
								title="Eliminar"
								className="mt-2 self-start"
								onClick={() => onDelete(u.id, u.fullName)}
							/>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}

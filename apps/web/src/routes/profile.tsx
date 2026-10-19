import { getApiErrorMessage } from "@sports/api-client";
import { useChangePassword } from "@sports/api-client/hooks";
import {
	Badge,
	Button,
	Card,
	CircleUserRound,
	DECORATIVE,
	Input,
	Label,
	Save,
	Skeleton,
	toast,
} from "@sports/ui";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import * as React from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";

export const Route = createFileRoute("/profile")({
	head: () => ({
		meta: [{ title: "Mi perfil — Sports Platform" }],
	}),
	component: ProfilePage,
});

function ProfilePage() {
	const { user, isAuthenticated, isLoading } = useAuth();

	if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
	if (!isAuthenticated || !user) return <Navigate to="/auth/login" />;

	return (
		<div className="demo-page space-y-6">
			<h1 className="demo-title flex items-center gap-2">
				<CircleUserRound
					{...DECORATIVE}
					className="size-5 text-(--sea-ink-soft)"
				/>
				Mi cuenta
			</h1>
			<Card className="p-4">
				<div className="font-bold">{user.fullName}</div>
				<div className="mt-1 text-sm text-(--sea-ink-soft)">{user.email}</div>
				<div className="mt-2">
					<Badge variant="secondary">{user.role}</Badge>
				</div>
			</Card>
			<ChangePasswordForm />
		</div>
	);
}

function ChangePasswordForm() {
	const changePassword = useChangePassword(api);
	const [currentPassword, setCurrentPassword] = React.useState("");
	const [newPassword, setNewPassword] = React.useState("");
	const [confirm, setConfirm] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);

	const onSubmit = async (e: React.SyntheticEvent) => {
		e.preventDefault();
		setError(null);
		if (newPassword !== confirm) {
			setError("La nueva contraseña y su confirmación no coinciden.");
			return;
		}
		if (newPassword.length < 8) {
			setError("La nueva contraseña debe tener al menos 8 caracteres.");
			return;
		}
		try {
			await changePassword.mutateAsync({ currentPassword, newPassword });
			setCurrentPassword("");
			setNewPassword("");
			setConfirm("");
			toast.success("Contraseña actualizada");
		} catch (err) {
			toast.error("No se pudo cambiar la contraseña", getApiErrorMessage(err));
		}
	};

	return (
		<Card className="p-4">
			<h3 className="font-bold">Cambiar contraseña</h3>
			<form onSubmit={onSubmit} className="mt-3 space-y-3">
				<div>
					<Label>Contraseña actual</Label>
					<Input
						type="password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						required
						autoComplete="current-password"
					/>
				</div>
				<div>
					<Label>Nueva contraseña</Label>
					<Input
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						required
						minLength={8}
						autoComplete="new-password"
					/>
				</div>
				<div>
					<Label>Confirmar nueva contraseña</Label>
					<Input
						type="password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						required
						autoComplete="new-password"
					/>
				</div>
				<Button type="submit" icon={Save} disabled={changePassword.isPending}>
					Guardar
				</Button>
				{error && <div className="demo-alert-danger text-sm">{error}</div>}
			</form>
		</Card>
	);
}

import { Button, Input, Label, Select } from "@sports/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "../../lib/auth";

export const Route = createFileRoute("/auth/register")({
	component: RegisterPage,
});

function RegisterPage() {
	const { register, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [fullName, setFullName] = React.useState("");
	const [role, setRole] = React.useState<"viewer_staff" | "organizer">(
		"viewer_staff",
	);
	const [error, setError] = React.useState<string | null>(null);
	const [pending, setPending] = React.useState(false);

	React.useEffect(() => {
		if (isAuthenticated) navigate({ to: "/" });
	}, [isAuthenticated, navigate]);

	async function onSubmit(e: React.SyntheticEvent) {
		e.preventDefault();
		setError(null);
		setPending(true);
		try {
			await register({ email, password, fullName, role });
			// register ya hace auto-login
			navigate({ to: "/" });
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error al registrarse");
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="demo-center">
			<form
				onSubmit={onSubmit}
				className="demo-panel w-full max-w-md space-y-4"
			>
				<h1 className="demo-title text-2xl">Registro</h1>
				<p className="demo-muted text-sm">
					Crea tu cuenta. Solo <code>viewer_staff</code> /{" "}
					<code>organizer</code> vía <code>POST /auth/register</code>; el resto
					se normaliza a <code>viewer_staff</code>.
				</p>
				{error && <div className="demo-alert-danger text-sm">{error}</div>}
				<div className="space-y-2">
					<Label htmlFor="fullName">Nombre completo</Label>
					<Input
						id="fullName"
						value={fullName}
						onChange={(e) => setFullName(e.target.value)}
						required
						placeholder="Juan Pérez"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="email">Email</Label>
					<Input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						required
						placeholder="you@example.com"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="password">Contraseña</Label>
					<Input
						id="password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						required
						placeholder="Min 8 caracteres"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="role">Rol inicial</Label>
					<Select
						id="role"
						value={role}
						onChange={(e) => setRole(e.target.value as never)}
					>
						<option value="viewer_staff">viewer_staff</option>
						<option value="organizer">organizer</option>
					</Select>
				</div>
				<Button type="submit" disabled={pending} className="w-full">
					{pending ? "Registrando…" : "Crear cuenta"}
				</Button>
				<p className="text-center text-sm text-(--sea-ink-soft)">
					¿Ya tienes cuenta?{" "}
					<Link to="/auth/login" className="font-bold">
						Inicia sesión
					</Link>
				</p>
			</form>
		</div>
	);
}

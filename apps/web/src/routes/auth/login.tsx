import { Button, Input, Label } from "@sports/ui";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "../../lib/auth";

export const Route = createFileRoute("/auth/login")({
	component: LoginPage,
});

function LoginPage() {
	const { login, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const [email, setEmail] = React.useState("");
	const [password, setPassword] = React.useState("");
	const [error, setError] = React.useState<string | null>(null);
	const [pending, setPending] = React.useState(false);

	React.useEffect(() => {
		if (isAuthenticated) navigate({ to: "/" });
	}, [isAuthenticated, navigate]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setPending(true);
		try {
			await login(email, password);
			navigate({ to: "/" });
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : "Error al iniciar sesión");
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
				<h1 className="demo-title text-2xl">Iniciar sesión</h1>
				<p className="demo-muted text-sm">
					Usa tu email y contraseña. Los tokens se guardan en{" "}
					<code>localStorage</code> vía <code>src/lib/api.ts</code>.
				</p>
				{error && <div className="demo-alert-danger text-sm">{error}</div>}
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
						placeholder="••••••••"
					/>
				</div>
				<Button type="submit" disabled={pending} className="w-full">
					{pending ? "Entrando…" : "Entrar"}
				</Button>
				<p className="text-center text-sm text-(--sea-ink-soft)">
					¿No tienes cuenta?{" "}
					<Link to="/auth/register" className="font-bold">
						Regístrate
					</Link>
				</p>
			</form>
		</div>
	);
}

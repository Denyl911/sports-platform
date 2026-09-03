import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/")({
	component: AdminDashboard,
});

function AdminDashboard() {
	return (
		<div className="space-y-6">
			<div className="island-shell rounded-2xl p-6">
				<h1 className="text-2xl font-black text-(--sea-ink)">Admin</h1>
				<p className="mt-2 text-sm text-(--sea-ink-soft)">
					Gestión de torneos, fixture y membresías. Requiere rol{" "}
					<code>admin</code> / <code>organizer</code> (o{" "}
					<code>super_admin</code>).
				</p>
				<div className="mt-4 flex flex-wrap gap-2">
					<Link
						to="/"
						className="demo-button-secondary rounded-full border px-4 py-2 text-sm"
					>
						Volver al sitio público
					</Link>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div className="demo-card">
					<h3 className="font-bold">Torneos</h3>
					<p className="demo-muted text-sm">
						Crear y editar torneos, ediciones, etapas y grupos.
					</p>
				</div>
				<div className="demo-card">
					<h3 className="font-bold">Fixture</h3>
					<p className="demo-muted text-sm">Partidos, sedes y programación.</p>
				</div>
				<div className="demo-card">
					<h3 className="font-bold">Membresías</h3>
					<p className="demo-muted text-sm">
						Asignar referee / statistician por torneo.
					</p>
				</div>
			</div>
		</div>
	);
}

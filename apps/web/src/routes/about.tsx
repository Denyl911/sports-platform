import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
	head: () => ({
		meta: [
			{ title: "Acerca de — Sports Platform" },
			{
				name: "description",
				content: "Qué es Sports Platform y cómo está construida.",
			},
		],
	}),
	component: About,
});

function About() {
	return (
		<main className="page-wrap space-y-6 px-4 py-12">
			<section className="island-shell rounded-2xl p-6 sm:p-8">
				<p className="island-kicker mb-2">Acerca de</p>
				<h1 className="display-title mb-3 text-4xl font-bold text-(--sea-ink) sm:text-5xl">
					Sports Platform
				</h1>
				<p className="m-0 max-w-3xl text-base leading-8 text-(--sea-ink-soft)">
					Plataforma multideporte para organizar y seguir torneos: fixture,
					tablas de posiciones, planteles, sedes y marcadores en vivo con
					actualización en tiempo real.
				</p>
			</section>

			<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{[
					{
						to: "/tournaments",
						title: "Torneos",
						desc: "Ediciones, etapas, grupos e inscriptos.",
					},
					{
						to: "/matches",
						title: "Partidos y en vivo",
						desc: "Fixture, resultados y eventos en tiempo real.",
					},
					{
						to: "/clubs",
						title: "Clubes y equipos",
						desc: "Clubes, equipos, jugadores y planteles por edición.",
					},
				].map((c) => (
					<Link key={c.to} to={c.to} className="demo-card no-underline">
						<h3 className="font-bold">{c.title}</h3>
						<p className="demo-muted text-sm">{c.desc}</p>
					</Link>
				))}
			</section>
		</main>
	);
}

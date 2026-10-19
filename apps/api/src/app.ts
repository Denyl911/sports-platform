import cors from "@elysia/cors";
import openapi from "@elysia/openapi";
import { Elysia } from "elysia";
import { resolveCorsOrigins } from "./lib/config";
import { errorMiddleware } from "./middlewares/error.middleware";
import { authRoutes } from "./routes/auth";
import { clubsRoutes } from "./routes/clubs";
import { invitationRoutes } from "./routes/invitations";
import { liveRoutes } from "./routes/live";
import { mediaRoutes } from "./routes/media";
import { matchesRoutes } from "./routes/matches";
import { playersRoutes } from "./routes/players";
import {
	registrationItemRoutes,
	stageRegistrationsRoutes,
} from "./routes/registrations";
import { rosterItemRoutes, rostersRoutes } from "./routes/rosters";
import { sportsRoutes } from "./routes/sports";
import { standingItemRoutes, standingsRoutes } from "./routes/standings";
import { teamsRoutes } from "./routes/teams";
import { tournamentsRoutes } from "./routes/tournaments";
import { membershipItemRoutes, usersRoutes } from "./routes/users";
import { venuesRoutes } from "./routes/venues";

// Instancia de la API sin listener: consumible por `treaty(app)` en tests
// y por src/index.ts al desplegar.
export const app = new Elysia({
	websocket: {
		idleTimeout: 30,
	},
})
	// Logestic desactivado: ensucia la salida de `bun test`
	// .use(Logestic.preset("fancy"))
	.use(cors({ origin: resolveCorsOrigins() }))
	.use(
		openapi({
			documentation: {
				info: {
					title: "Sports Platform API",
					version: "0.0.1",
					description:
						"API REST para la plataforma deportiva multideporte. Gestiona torneos, ediciones, etapas, grupos, inscripciones, plantillas, partidos en vivo, tablas de posiciones, usuarios y membresías. Todas las respuestas de error siguen el formato `{ message: string }`. Los listados retornan `{ items: T[], total: number }`.",
					contact: { name: "Sports Platform" },
				},
				components: {
					securitySchemes: {
						bearerAuth: {
							type: "http",
							scheme: "bearer",
							bearerFormat: "JWT",
							description:
								"Access token obtenido vía POST /auth/login o /auth/refresh. Enviar como `Authorization: Bearer <token>`.",
						},
					},
				},
			},
			path: "/docs",
			enabled: process.env.NODE_ENV !== "production",
		}),
	)
	.use(errorMiddleware)
	.use(authRoutes)
	.use(sportsRoutes)
	.use(venuesRoutes)
	.use(clubsRoutes)
	.use(teamsRoutes)
	.use(playersRoutes)
	.use(tournamentsRoutes)
	.use(stageRegistrationsRoutes)
	.use(registrationItemRoutes)
	.use(rostersRoutes)
	.use(rosterItemRoutes)
	.use(standingsRoutes)
	.use(standingItemRoutes)
	.use(usersRoutes)
	.use(membershipItemRoutes)
	.use(matchesRoutes)
	.use(invitationRoutes)
	.use(mediaRoutes)
	.use(liveRoutes)
	.get("/", () => "Hello Elysia");

// Contrato de tipos para Eden Treaty en todo el monorepo
export type App = typeof app;

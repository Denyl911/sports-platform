import { Elysia } from "elysia";
import { errorMiddleware } from "./middlewares/error.middleware";
import { authRoutes } from "./routes/auth";
import { clubsRoutes } from "./routes/clubs";
import { matchesRoutes } from "./routes/matches";
import { playersRoutes } from "./routes/players";
import {
	registrationItemRoutes,
	stageRegistrationsRoutes,
} from "./routes/registrations";
import { rosterItemRoutes, rostersRoutes } from "./routes/rosters";
import { standingsRoutes, standingItemRoutes } from "./routes/standings";
import { sportsRoutes } from "./routes/sports";
import { tournamentsRoutes } from "./routes/tournaments";
import { usersRoutes, membershipItemRoutes } from "./routes/users";
import { venuesRoutes } from "./routes/venues";
import { teamsRoutes } from "./routes/teams";
import { Logestic } from "logestic";
import cors from "@elysia/cors";
import openapi from "@elysia/openapi";
import { resolveCorsOrigins } from "./lib/config";

// Instancia de la API sin listener: consumible por `treaty(app)` en tests
// y por src/index.ts al desplegar.
export const app = new Elysia()
	.use(Logestic.preset("fancy"))
	.use(cors({ origin: resolveCorsOrigins() }))
	.use(
		openapi({
			documentation: {
				info: {
					title: "Sports Platform API",
					version: "0.0.1",
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
	.get("/", () => "Hello Elysia");

// Contrato de tipos para Eden Treaty en todo el monorepo
export type App = typeof app;

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

function resolvePort(): number {
	const raw = process.env.PORT ?? "3000";
	const port = Number(raw);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(
			`Invalid PORT value '${raw}'. Must be an integer between 1 and 65535.`,
		);
	}
	return port;
}

// Orígenes permitidos (separados por coma). En producción debería configurarse
// explícitamente; si falta, solo se advierte.
function resolveCorsOrigins(): string[] | true {
	const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
	if (!raw) {
		if (process.env.NODE_ENV === "production") {
			console.warn(
				"[cors] CORS_ALLOWED_ORIGINS is not set in production. Allowing all origins.",
			);
		}
		return true;
	}
	return raw
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
}

const app = new Elysia()
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
	.get("/", () => "Hello Elysia")
	.listen(resolvePort());

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(`Docs: http://localhost:${app.server?.port}/docs`);

export type App = typeof app;

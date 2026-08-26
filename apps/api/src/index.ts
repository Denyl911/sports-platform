import { Elysia, t } from "elysia";
import { errorMiddleware } from "./middlewares/error.middleware";
import { authRoutes } from "./routes/auth";
import { matchesRoutes } from "./routes/matches";
import { Logestic } from "logestic";
import cors from "@elysia/cors";
import openapi from "@elysia/openapi";

const app = new Elysia()
	.use(Logestic.preset("fancy"))
	.use(cors())
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
	.use(matchesRoutes)
	.get("/", () => "Hello Elysia")
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(`Docs: http://localhost:${app.server?.port}/docs`);

export type App = typeof app;

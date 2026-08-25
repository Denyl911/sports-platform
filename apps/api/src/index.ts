import cors from "@elysia/cors";
import openapi from "@elysia/openapi";
import { Elysia } from "elysia";
import { Logestic } from "logestic";

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
	.get("/", () => "Hello Elysia")
	.listen(3000);

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;

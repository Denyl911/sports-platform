import { app } from "./app";
import { resolvePort } from "./lib/config";

app.listen(resolvePort());

console.log(
	`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
console.log(`Docs: http://localhost:${app.server?.port}/docs`);

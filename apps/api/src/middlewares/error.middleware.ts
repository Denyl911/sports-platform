import { Elysia } from "elysia";
import { DomainError } from "../services/errors";

// Traduce errores de dominio a respuestas HTTP. Debe registrarse ANTES de las rutas.
// `as: "global"` es obligatorio: sin él el hook queda scopped al plugin
// y las rutas del app principal no lo recibirían.
export const errorMiddleware = new Elysia({ name: "error-middleware" }).onError(
	{ as: "global" },
	({ code, error, set }) => {
		// 1. Errores de dominio lanzados por los services
		if (error instanceof DomainError) {
			set.status = error.status;
			return { message: error.message };
		}

		// 2. Validación automática de Elysia
		if (code === "VALIDATION") {
			set.status = 400;
			return { message: error.message };
		}

		// 3. Violaciones de constraints de Postgres (race conditions / integridad referencial)
		// Drizzle envuelve el error en DrizzleQueryError (cause); bun-sql expone
		// el SQLSTATE en `errno` y otros drivers en `code`.
		const raw = error as {
			code?: string;
			errno?: string;
			cause?: { code?: string; errno?: string };
		};
		// El SQLSTATE son exactamente 5 dígitos: descarta códigos de driver
		// como ERR_POSTGRES_SERVER_ERROR presentes en la misma propiedad
		const candidates = [
			raw.code,
			raw.errno,
			raw.cause?.code,
			raw.cause?.errno,
		];
		const pgCode = candidates.find((c) => typeof c === "string" && /^\d{5}$/.test(c));
		if (pgCode === "23505") {
			set.status = 409;
			return { message: "Resource already exists" };
		}
		if (pgCode === "23503") {
			set.status = 409;
			return {
				message: "Resource is referenced by other records and cannot be modified",
			};
		}

		// 4. Ruta inexistente
		if (code === "NOT_FOUND") {
			set.status = 404;
			return { message: "Not Found" };
		}

		// 5. Fallback
		console.error("[unhandled]", error);
		set.status = 500;
		return { message: "Internal Server Error" };
	},
);

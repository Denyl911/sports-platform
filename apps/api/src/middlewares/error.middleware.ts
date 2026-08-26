import { Elysia } from "elysia";
import { DomainError } from "../services/errors";

// Traduce errores de dominio a respuestas HTTP. Debe registrarse ANTES de las rutas.
export const errorMiddleware = new Elysia({ name: "error-middleware" }).onError(
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

		// 3. Ruta inexistente
		if (code === "NOT_FOUND") {
			set.status = 404;
			return { message: "Not Found" };
		}

		// 4. Fallback
		console.error("[unhandled]", error);
		set.status = 500;
		return { message: "Internal Server Error" };
	},
);

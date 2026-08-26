import { t } from "elysia";

// Esquemas de error comunes (DomainError, validación, FK)
export const errorMessageSchema = t.Object(
	{ message: t.String({ description: "Mensaje de error legible" }) },
	{ description: "Respuesta de error" },
);

export const successSchema = t.Object(
	{ success: t.Boolean({ description: "Operación exitosa" }) },
	{ description: "Confirmación de éxito" },
);

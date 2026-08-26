// Configuración de servidor derivada de entorno, testeable en aislamiento
export function resolvePort(): number {
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
export function resolveCorsOrigins(): string[] | true {
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

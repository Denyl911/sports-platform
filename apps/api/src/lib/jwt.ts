import { jwt } from "@elysia/jwt";

const DEV_ACCESS_SECRET = "dev-access-secret";
const DEV_REFRESH_SECRET = "dev-refresh-secret";
const IS_PROD = process.env.NODE_ENV === "production";

function requireSecret(name: string, devFallback: string): string {
	const value = process.env[name];
	if (value) return value;
	if (IS_PROD) {
		throw new Error(
			`Missing required environment variable '${name}'. Refusing to start with insecure JWT secrets in production.`,
		);
	}
	console.warn(
		`[jwt] '${name}' is not set. Using insecure development secret. Never do this in production.`,
	);
	return devFallback;
}

const ACCESS_SECRET = requireSecret("JWT_ACCESS_SECRET", DEV_ACCESS_SECRET);
const REFRESH_SECRET = requireSecret("JWT_REFRESH_SECRET", DEV_REFRESH_SECRET);

// Payload embebido en el access token: id y rol del usuario
export interface AccessTokenPayload {
	sub: string;
	role: string;
}

// Token de corta duración para peticiones API
export const accessTokenJwt = jwt({
	name: "accessToken",
	secret: ACCESS_SECRET,
	exp: "1h",
});

// Token de larga duración para renovar el par (sesión total ~7 días)
export const refreshTokenJwt = jwt({
	name: "refreshToken",
	secret: REFRESH_SECRET,
	exp: "7d",
});

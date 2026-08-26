import { jwt } from "@elysia/jwt";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret";

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

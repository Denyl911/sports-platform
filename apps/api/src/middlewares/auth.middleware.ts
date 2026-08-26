import { Elysia } from "elysia";
import { accessTokenJwt, type AccessTokenPayload } from "../lib/jwt";
import { DomainError } from "../services/errors";

export interface Requester {
	id: string;
	role: string;
}

function extractBearerToken(headers: Record<string, string | undefined>) {
	const header = headers.authorization;
	if (!header?.startsWith("Bearer ")) return null;
	return header.slice(7);
}

async function verifyAccessToken(
	verify: (token: string) => Promise<unknown>,
	headers: Record<string, string | undefined>,
): Promise<Requester | null> {
	const token = extractBearerToken(headers);
	if (!token) return null;

	const payload = await verify(token).catch(() => null);
	if (!payload || typeof payload !== "object") return null;

	const claims = payload as AccessTokenPayload;
	if (!claims.sub || !claims.role) return null;

	return { id: claims.sub, role: claims.role };
}

// Guard obligatorio: lanza 401 si no hay token válido
export const authGuard = new Elysia({ name: "auth-guard" })
	.use(accessTokenJwt)
	.derive(async ({ headers, accessToken }) => {
		const requester = await verifyAccessToken(
			(t) => accessToken.verify(t),
			headers,
		);
		if (!requester) throw DomainError.unauthorized("Authentication required");
		return { requester };
	});

// Derivación opcional: expone `requester` solo si hay token válido
export const optionalAuth = new Elysia({ name: "optional-auth" })
	.use(accessTokenJwt)
	.derive(async ({ headers, accessToken }) => ({
		requester: await verifyAccessToken((t) => accessToken.verify(t), headers),
	}));

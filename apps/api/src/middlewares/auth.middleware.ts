import { Elysia, t } from "elysia";
import { accessTokenJwt } from "../lib/jwt";
import { DomainError } from "../services/errors";
import { findAuthUser, type UserPublic } from "../services/user.service";

// Usuario autenticado, sin el hash de contraseña (el service ya lo omite)
export type AuthUser = UserPublic;

// Guard de autenticación activable por ruta con `auth: true`.
// Consulta la DB en cada request: rol siempre fresco y valida isActive.
export const jwtMiddleware = new Elysia({ name: "jwt-auth" })
	.use(accessTokenJwt)
	.macro({
		auth: {
			// Header opcional: si falta, el resolve lanza 401 (no un 400 de validación)
			headers: t.Optional(
				t.Object({
					authorization: t.Optional(t.String({ description: "Bearer token" })),
				}),
			),
			async resolve({
				accessToken,
				headers,
			}: {
				accessToken: { verify(token: string): Promise<unknown> };
				headers?: Record<string, string | undefined>;
			}) {
				const authorization = headers?.authorization;
				if (!authorization?.startsWith("Bearer ")) {
					throw DomainError.unauthorized("Token requerido");
				}

				const token = authorization.slice(7);
				const payload = (await accessToken.verify(token).catch(() => null)) as {
					sub?: string;
					role?: string;
				} | null;

				if (!payload?.sub) {
					throw DomainError.unauthorized("Token inválido");
				}

				const user = await findAuthUser(payload.sub).catch(() => null);

				if (!user) {
					throw DomainError.unauthorized("Usuario no encontrado");
				}

				if (!user.isActive) {
					throw DomainError.unauthorized("Usuario desactivado");
				}

				return {
					user,
					userId: user.id,
					userRole: user.role,
				};
			},
		},
	});

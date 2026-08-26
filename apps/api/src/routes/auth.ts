import {
	authLoginResponseSchema,
	authRefreshSchema,
	authTokenPairSchema,
	userChangePasswordSchema,
	userLoginSchema,
} from "@sports/schemas";
import { Elysia } from "elysia";
import { accessTokenJwt, refreshTokenJwt } from "../lib/jwt";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import {
	changePassword,
	findUserById,
	verifyCredentials,
} from "../services/user.service";

export const authRoutes = new Elysia({ prefix: "/auth", tags: ["Auth"] })
	.use(accessTokenJwt)
	.use(refreshTokenJwt)
	.use(jwtMiddleware)
	.post(
		"/login",
		async ({ body, set, accessToken, refreshToken }) => {
			const user = await verifyCredentials(body.email, body.password);

			if (!user) {
				set.status = 401;
				return { message: "Invalid email or password" };
			}

			return {
				accessToken: await accessToken.sign({ sub: user.id, role: user.role }),
				refreshToken: await refreshToken.sign({ sub: user.id }),
				user,
			};
		},
		{
			body: userLoginSchema,
			response: {
				200: authLoginResponseSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
			},
			detail: {
				summary: "Iniciar sesión",
				description:
					"Autentica con email y contraseña. Retorna par de tokens (access 1h, refresh 7d) y el usuario público sin `passwordHash`. 401 si credenciales inválidas o usuario inactivo.",
				tags: ["Auth"],
			},
		},
	)
	.post(
		"/refresh",
		async ({ body, set, accessToken, refreshToken }) => {
			const payload = await refreshToken
				.verify(body.refreshToken)
				.catch(() => null);

			if (!payload || typeof payload !== "object" || !("sub" in payload)) {
				set.status = 401;
				return { message: "Invalid or expired refresh token" };
			}

			// Rol fresco desde DB al renovar la sesión
			let user: Awaited<ReturnType<typeof findUserById>> | null = null;
			try {
				user = await findUserById((payload as { sub: string }).sub);
			} catch {
				set.status = 401;
				return { message: "Invalid or expired refresh token" };
			}
			if (!user.isActive) {
				set.status = 403;
				return { message: "User is inactive" };
			}

			return {
				accessToken: await accessToken.sign({ sub: user.id, role: user.role }),
				refreshToken: await refreshToken.sign({ sub: user.id }),
			};
		},
		{
			body: authRefreshSchema,
			response: {
				200: authTokenPairSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
			},
			detail: {
				summary: "Refrescar tokens",
				description:
					"Intercambia un refreshToken válido por un nuevo par access/refresh. 401 si el token es inválido/expirado o el usuario ya no existe. 403 si el usuario está inactivo.",
				tags: ["Auth"],
			},
		},
	)
	.post(
		"/change-password",
		async ({ userId, body }) => {
			await changePassword(userId, body.currentPassword, body.newPassword);
			return { success: true };
		},
		{
			auth: true,
			body: userChangePasswordSchema,
			response: {
				200: successSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Cambiar contraseña del usuario autenticado",
				description:
					"Requiere `Authorization: Bearer <accessToken>`. Valida la contraseña actual con `Bun.password.verify` y actualiza el hash. 401 si la contraseña actual es incorrecta.",
				tags: ["Auth"],
			},
		},
	);

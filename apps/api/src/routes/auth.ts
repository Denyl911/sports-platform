import { Elysia, t } from "elysia";
import { accessTokenJwt, refreshTokenJwt } from "../lib/jwt";
import {
	authRefreshSchema,
	authTokenPairSchema,
	selectUserSchema,
	userLoginSchema,
} from "@sports/schemas";
import { findUserById, verifyCredentials } from "../services/user.service";

export const authRoutes = new Elysia({ prefix: "/auth", tags: ["Auth"] })
	.use(accessTokenJwt)
	.use(refreshTokenJwt)
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
			200: t.Intersect([selectUserSchema, authTokenPairSchema]),
			401: t.Object({ message: t.String() }),
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
			const user = await findUserById((payload as { sub: string }).sub);
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
				401: t.Object({ message: t.String() }),
				403: t.Object({ message: t.String() }),
			},
		},
	);

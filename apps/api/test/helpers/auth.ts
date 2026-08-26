import { Elysia } from "elysia";
import { accessTokenJwt } from "../../src/lib/jwt";

// El plugin @elysia/jwt solo expone sign/verify dentro del contexto de un app.
// Esta mini-instancia sirve para firmar tokens reales en tests sin pasar por /login.
const signer = new Elysia()
	.use(accessTokenJwt)
	.get("/__sign/:sub/:role", ({ accessToken, params }) =>
		accessToken.sign(params),
	);

export async function signToken(sub: string, role: string): Promise<string> {
	const response = await signer.handle(
		new Request(`http://localhost/__sign/${sub}/${role}`),
	);
	return response.text();
}

// Firma un access token directamente (sin pasar por /auth/login)
export async function authHeaders(user: { id: string; role: string }) {
	const token = await signToken(user.id, user.role);
	return { authorization: `Bearer ${token}` };
}

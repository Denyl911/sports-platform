import { type ApiClient, createApiClient, unwrap } from "@sports/api-client";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

function getAccessToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(ACCESS_TOKEN_KEY);
	} catch {
		return null;
	}
}

function getRefreshToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(REFRESH_TOKEN_KEY);
	} catch {
		return null;
	}
}

export function setTokens(tokens: {
	accessToken: string;
	refreshToken: string;
}) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
		window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
	} catch {}
}

export function clearTokens() {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.removeItem(ACCESS_TOKEN_KEY);
		window.localStorage.removeItem(REFRESH_TOKEN_KEY);
	} catch {}
}

export function getStoredAccessToken(): string | null {
	return getAccessToken();
}

export function getStoredRefreshToken(): string | null {
	return getRefreshToken();
}

// El refresh no puede montar el propio `api`: el 401 de la llamada de
// refresh volvería a disparar `onUnauthorized` (se engancha en `onResponse`)
// y anidar el ciclo con el refreshToken en localStorage intacto. El cliente
// desnudo —sin `getToken` ni `onUnauthorized`— lleva la llamada por el mismo
// treaty tipado: la ruta de refresh tiene una sola forma en el contrato
// (ADR 003: la red viaja por @sports/api-client, también este caso).
const refreshClient: ApiClient = createApiClient({
	baseUrl: import.meta.env.VITE_API_URL,
});

function redirectToLogin() {
	if (
		typeof window !== "undefined" &&
		window.location.pathname !== "/auth/login"
	) {
		window.location.href = "/auth/login";
	}
}

// Singleton client for CSR. For SSR, TanStack Start will call loaders with same client
// but `getToken` reads from localStorage only on client; on server, pass token via serverFn cookie if needed.
export const api: ApiClient = createApiClient({
	baseUrl: import.meta.env.VITE_API_URL,
	getToken: getAccessToken,
	onUnauthorized: async () => {
		// Intenta refresh una vez antes de redirigir
		const refreshToken = getRefreshToken();
		if (!refreshToken) {
			clearTokens();
			redirectToLogin();
			return;
		}
		try {
			const data = await unwrap(
				refreshClient.auth.refresh.post({ refreshToken }),
			);
			setTokens(data as { accessToken: string; refreshToken: string });
		} catch {
			clearTokens();
			redirectToLogin();
		}
	},
});

export type AppApiClient = typeof api;

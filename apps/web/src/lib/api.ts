import { type ApiClient, createApiClient } from "@sports/api-client";

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
			if (
				typeof window !== "undefined" &&
				window.location.pathname !== "/auth/login"
			) {
				window.location.href = "/auth/login";
			}
			return;
		}
		try {
			// Import dinámico para evitar ciclo con treaty
			const res = await fetch(
				`${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/auth/refresh`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ refreshToken }),
				},
			);
			if (!res.ok) throw new Error("refresh failed");
			const data = (await res.json()) as {
				accessToken: string;
				refreshToken: string;
			};
			setTokens(data);
		} catch {
			clearTokens();
			if (
				typeof window !== "undefined" &&
				window.location.pathname !== "/auth/login"
			) {
				window.location.href = "/auth/login";
			}
		}
	},
});

export type AppApiClient = typeof api;

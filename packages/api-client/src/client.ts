import { treaty } from "@elysia/eden";
// peerDependency ligera: `api` es `apps/api` vía `workspace:*` (devDependency).
import type { App } from "api/src/app";
import { resolveBaseUrl } from "./config";

// ---------------------------------------------------------------------------
// Tipos & errores
// ---------------------------------------------------------------------------

export class ApiError extends Error {
	readonly status: number;
	readonly value: unknown;
	readonly response: Response | null;

	constructor(
		message: string,
		status: number,
		value: unknown,
		response: Response | null = null,
	) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.value = value;
		this.response = response;
	}
}

export function isApiError(e: unknown): e is ApiError {
	return e instanceof ApiError;
}

export type TreatyResponse = {
	data: unknown;
	error: { status: number | string; value: unknown } | null;
	status: number;
	response: Response;
};

// ---------------------------------------------------------------------------
// Opciones del cliente
// ---------------------------------------------------------------------------

export interface ApiClientOptions {
	/** URL base del API. Si es función, se evalúa lazy (útil para SSR). */
	baseUrl?: string | (() => string);
	/** Retorna el accessToken actual (localStorage, cookie, secure-store). Soporta async. */
	getToken?: () =>
		| string
		| null
		| undefined
		| Promise<string | null | undefined>;
	/** Fetch custom (SSR `fetch` de Nitro, Tauri, etc.) */
	fetch?: typeof fetch;
	/** Callback cliente para 401 (ej. refresh o redirect a /login). Se ejecuta en `onResponse`. */
	onUnauthorized?: (response: Response) => void | Promise<void>;
	/** Headers extra estáticos o dinámicos (se mezclan con Authorization). */
	headers?:
		| Record<string, string>
		| (() => Record<string, string> | Promise<Record<string, string>>);
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function buildAuthHeader(
	getToken?: ApiClientOptions["getToken"],
): Promise<Record<string, string> | undefined> {
	if (!getToken) return undefined;
	const token = await getToken();
	if (!token) return undefined;
	const t = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
	return { Authorization: t };
}

async function buildExtraHeaders(
	headers?: ApiClientOptions["headers"],
): Promise<Record<string, string> | undefined> {
	if (!headers) return undefined;
	const h = typeof headers === "function" ? await headers() : headers;
	return h ?? undefined;
}

// ---------------------------------------------------------------------------
// Factory principal
// ---------------------------------------------------------------------------

/**
 * Crea un cliente Eden Treaty tipado contra `App` (`apps/api/src/app.ts:80`).
 *
 * ```ts
 * const client = createApiClient({
 *   baseUrl: () => import.meta.env.VITE_API_URL,
 *   getToken: () => localStorage.getItem("accessToken"),
 *   onUnauthorized: async () => {
 *     // intenta refresh o redirect
 *   }
 * })
 * // uso delgado (wrapper treaty):
 * const { data, error } = await client.auth.login.post({ email, password })
 * const tournaments = await unwrap(client.tournaments.get({ query: {} }))
 * ```
 *
 * El manejo de auth es **en el cliente** (no en el servidor): inyecta
 * `Authorization: Bearer <token>` vía `treaty` `headers` hook y dispara
 * `onUnauthorized` en `onResponse` 401 para refresh.
 */
export function createApiClient(options: ApiClientOptions = {}) {
	const baseUrl = resolveBaseUrl(options.baseUrl);

	// Eden permite `headers` como función `(path, init) => headers` — se evalúa por request
	const headersHook = async (_path: string, _init: RequestInit) => {
		const [auth, extra] = await Promise.all([
			buildAuthHeader(options.getToken),
			buildExtraHeaders(options.headers),
		]);
		if (!auth && !extra) return undefined;
		return { ...extra, ...auth };
	};

	const client = treaty<App>(baseUrl, {
		fetcher: options.fetch as unknown as typeof fetch | undefined,
		headers: headersHook as unknown as never,
		onResponse: options.onUnauthorized
			? ([
					async (res: Response) => {
						if (res.status === 401) {
							await options.onUnauthorized?.(res);
						}
					},
				] as unknown as never)
			: undefined,
	});

	return client;
}

export type ApiClient = ReturnType<typeof createApiClient>;

// ---------------------------------------------------------------------------
// Unwrap helpers (thin wrappers sobre treaty)
// ---------------------------------------------------------------------------

/**
 * Desenvuelve una TreatyResponse: retorna `data` o lanza `ApiError`.
 * Útil para wrappers delgados: `await unwrap(client.tournaments.get())`
 */
export async function unwrap<T>(
	promiseOrResponse: Promise<TreatyResponse> | TreatyResponse,
): Promise<T> {
	const res = await promiseOrResponse;
	if (res.error) {
		const status =
			typeof res.error.status === "number"
				? res.error.status
				: Number(res.error.status) || res.status || 500;
		const value = res.error.value as { message?: string } | unknown;
		const message =
			(value as { message?: string })?.message ??
			`Request failed with status ${status}`;
		throw new ApiError(message, status, value, res.response ?? null);
	}
	return res.data as T;
}

/**
 * Variante que no lanza: retorna `{ data, error }` tipado.
 * Útil cuando se quiere manejar 404/409 sin try/catch.
 */
export async function unwrapSafe<T>(
	promiseOrResponse: Promise<TreatyResponse> | TreatyResponse,
): Promise<{
	data: T | null;
	error: ApiError | null;
	status: number;
	response: Response | null;
}> {
	const res = await promiseOrResponse;
	if (res.error) {
		const status =
			typeof res.error.status === "number"
				? res.error.status
				: Number(res.error.status) || res.status || 500;
		const value = res.error.value as { message?: string } | unknown;
		const message =
			(value as { message?: string })?.message ??
			`Request failed with status ${status}`;
		return {
			data: null,
			error: new ApiError(message, status, value, res.response ?? null),
			status,
			response: res.response ?? null,
		};
	}
	return {
		data: res.data as T,
		error: null,
		status: res.status,
		response: res.response ?? null,
	};
}

/**
 * Helper para invalidación cruzada: extrae `message` de un ApiError de forma segura.
 */
export function getApiErrorMessage(
	e: unknown,
	fallback = "Unknown error",
): string {
	if (e instanceof ApiError) return e.message;
	if (e instanceof Error) return e.message;
	return fallback;
}

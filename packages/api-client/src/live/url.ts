import { resolveBaseUrl } from "../config";

/**
 * Construye URL WebSocket para canales live.
 *
 * - Deriva `ws://` / `wss://` desde `resolveBaseUrl()` (http→ws, https→wss).
 * - Vía principal `?token=` (acordada): si `token` está presente, se añade `?token=<url-encoded>`.
 *   Compatible con browser y @tauri-apps/plugin-websocket (no soporta headers custom).
 *   El servidor también acepta `Authorization: Bearer` y `Sec-WebSocket-Protocol` como fallbacks
 *   (`apps/api/src/routes/live.ts:139`), pero el cliente prioriza `?token=`.
 * - Normaliza `baseUrl` y `path` (evita doble slash).
 *
 * @example
 * ```ts
 * wsUrlFromBase("http://localhost:3000", "/matches/123/live") // ws://localhost:3000/matches/123/live
 * wsUrlFromBase("https://api.example.com/", "/matches/123/live", "jwt...") // wss://api.example.com/matches/123/live?token=jwt...
 * ```
 */
export function wsUrlFromBase(
	baseUrl: string,
	path: string,
	token?: string | null,
): string {
	const base = baseUrl.replace(/\/+$/, "");
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	// http -> ws, https -> wss (preserva puerto y host)
	let wsBase: string;
	if (base.startsWith("https://")) {
		wsBase = `wss://${base.slice("https://".length)}`;
	} else if (base.startsWith("http://")) {
		wsBase = `ws://${base.slice("http://".length)}`;
	} else if (base.startsWith("wss://") || base.startsWith("ws://")) {
		wsBase = base;
	} else {
		// fallback: asume http
		wsBase = `ws://${base.replace(/^\/+/, "")}`;
	}

	const url = `${wsBase}${normalizedPath}`;
	if (!token) return url;

	const separator = url.includes("?") ? "&" : "?";
	return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Helper que resuelve `baseUrl` (vía `resolveBaseUrl`) y construye la URL live.
 * Útil para hooks: `getWsUrl("/matches/123/live", await getToken?.())`
 */
export function getLiveWsUrl(
	path: string,
	token?: string | null,
	baseUrlOverride?: string | (() => string) | null,
): string {
	const base = resolveBaseUrl(baseUrlOverride);
	return wsUrlFromBase(base, path, token);
}

/**
 * Construye directamente las URLs de los dos canales soportados.
 */
export function getMatchLiveUrl(
	matchId: string,
	token?: string | null,
	baseUrlOverride?: string | (() => string) | null,
): string {
	return getLiveWsUrl(`/matches/${matchId}/live`, token, baseUrlOverride);
}

export function getGroupLiveUrl(
	groupId: string,
	token?: string | null,
	baseUrlOverride?: string | (() => string) | null,
): string {
	return getLiveWsUrl(`/groups/${groupId}/live`, token, baseUrlOverride);
}

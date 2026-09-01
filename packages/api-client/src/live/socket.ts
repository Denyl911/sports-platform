import type { LiveMessage, LiveStatus } from "./types";
import { getGroupLiveUrl, getMatchLiveUrl } from "./url";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

export interface ManagedSocketOptions {
	getToken?: () =>
		| string
		| null
		| undefined
		| Promise<string | null | undefined>;
	baseUrl?: string | (() => string) | null;
	heartbeatInterval?: number; // ms, default 20_000 (< idleTimeout 30s)
	enabled?: boolean;
	onMessage?: (msg: LiveMessage) => void;
	onStatusChange?: (status: LiveStatus) => void;
	onError?: (error: Event | Error) => void;
	/** Para tests: inyectar WebSocket (Bun) o mock */
	createWebSocket?: (url: string, protocols?: string | string[]) => WebSocket;
}

export interface ManagedSocket {
	/** Estado actual */
	getStatus(): LiveStatus;
	/** Envía payload JSON (ej. {type:"score",payload})  */
	send(data: unknown): void;
	/** Cierra y desactiva reconexión */
	close(): void;
	/** Reconecta manualmente (fuerza) */
	reconnect(): void;
	/** WebSocket subyacente (para debug) */
	getRaw(): WebSocket | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isBrowser(): boolean {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

function randomJitter(max = 200): number {
	return Math.floor(Math.random() * max);
}

function nextBackoff(attempt: number): number {
	const base = 500 * 2 ** attempt;
	const capped = Math.min(30_000, base);
	return capped + randomJitter();
}

// ---------------------------------------------------------------------------
// Factory para match / group
// ---------------------------------------------------------------------------

export function createMatchSocket(
	matchId: string,
	options: ManagedSocketOptions = {},
): ManagedSocket {
	return createManagedSocket({
		...options,
		getUrl: async () => {
			const token = options.getToken ? await options.getToken() : null;
			return getMatchLiveUrl(matchId, token ?? null, options.baseUrl ?? null);
		},
		protocols: async () => {
			// Fallback Sec-WebSocket-Protocol: si hay token, lo enviamos también como subprotocolo
			// Compatible con live.test.ts "new WebSocket(url, token)" y servidor live.ts:141
			const token = options.getToken ? await options.getToken() : null;
			return token ? token : undefined;
		},
	});
}

export function createGroupSocket(
	groupId: string,
	options: ManagedSocketOptions = {},
): ManagedSocket {
	return createManagedSocket({
		...options,
		getUrl: async () => {
			const token = options.getToken ? await options.getToken() : null;
			return getGroupLiveUrl(groupId, token ?? null, options.baseUrl ?? null);
		},
		protocols: async () => {
			const token = options.getToken ? await options.getToken() : null;
			return token ? token : undefined;
		},
	});
}

// ---------------------------------------------------------------------------
// Core ManagedSocket
// ---------------------------------------------------------------------------

interface InternalOptions extends ManagedSocketOptions {
	getUrl: () => string | Promise<string>;
	protocols?: () =>
		| string
		| string[]
		| undefined
		| Promise<string | string[] | undefined>;
}

function createManagedSocket(internal: InternalOptions): ManagedSocket {
	let ws: WebSocket | null = null;
	let status: LiveStatus = "idle";
	let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let reconnectAttempts = 0;
	let closedIntentionally = false;
	let lastPongAt = Date.now();
	let heartbeatInterval = internal.heartbeatInterval ?? 20_000;

	const setStatus = (next: LiveStatus) => {
		if (status === next) return;
		status = next;
		internal.onStatusChange?.(next);
	};

	const clearTimers = () => {
		if (heartbeatTimer) {
			clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
		if (reconnectTimer) {
			clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	};

	const startHeartbeat = () => {
		if (heartbeatTimer) clearInterval(heartbeatTimer);
		heartbeatTimer = setInterval(() => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				try {
					ws.send(JSON.stringify({ type: "ping" }));
				} catch {}
				// Si no recibimos pong en 10s extra (total 30s = idleTimeout), forzar reconnect
				if (Date.now() - lastPongAt > heartbeatInterval + 10_000) {
					try {
						ws.close();
					} catch {}
				}
			}
		}, heartbeatInterval);
	};

	const scheduleReconnect = () => {
		if (closedIntentionally) return;
		if (internal.enabled === false) return;
		// Pausar si tab no visible o offline
		if (isBrowser()) {
			if (document.visibilityState === "hidden") {
				const onVisible = () => {
					document.removeEventListener("visibilitychange", onVisible);
					doConnect();
				};
				document.addEventListener("visibilitychange", onVisible);
				return;
			}
			if (!navigator.onLine) {
				const onOnline = () => {
					window.removeEventListener("online", onOnline);
					doConnect();
				};
				window.addEventListener("online", onOnline);
				return;
			}
		}
		const delay = nextBackoff(reconnectAttempts);
		reconnectAttempts += 1;
		setStatus("reconnecting");
		reconnectTimer = setTimeout(() => {
			doConnect();
		}, delay);
	};

	const createWebSocket = async (url: string): Promise<WebSocket> => {
		// Si hay factory inyectada (tests), úsala
		if (internal.createWebSocket) {
			const protocols = internal.protocols
				? await internal.protocols()
				: undefined;
			if (protocols) {
				return internal.createWebSocket(url, protocols);
			}
			return internal.createWebSocket(url);
		}

		// Intentar native WebSocket
		if (typeof WebSocket !== "undefined") {
			const protocols = internal.protocols
				? await internal.protocols()
				: undefined;
			try {
				if (protocols) {
					// Browser soporta segundo param como string|string[] (Sec-WebSocket-Protocol)
					// Bun soporta {headers} pero priorizamos ?token=, así que no usamos headers aquí
					return new WebSocket(url, protocols);
				}
				return new WebSocket(url);
			} catch (e) {
				// Fallthrough a Tauri
				if (
					!isBrowser() ||
					!(globalThis as unknown as { __TAURI__?: unknown }).__TAURI__
				) {
					throw e;
				}
			}
		}

		// Fallback Tauri plugin-websocket: dynamic import para no romper web
		try {
			// @ts-ignore plugin opcional
			const mod = await import("@tauri-apps/plugin-websocket");
			// plugin expone WebSocket.connect(url)
			if (mod && typeof mod.default?.connect === "function") {
				const tauriWs = await mod.default.connect(url);
				// Adaptar a interfaz WebSocket mínima
				return tauriWs as unknown as WebSocket;
			}
			if (typeof mod.WebSocket !== "undefined") {
				const protocols = internal.protocols
					? await internal.protocols()
					: undefined;
				return new (
					mod.WebSocket as unknown as new (
						url: string,
						protocols?: string | string[],
					) => WebSocket
				)(url, protocols);
			}
		} catch {}

		throw new Error("WebSocket not available in this environment");
	};

	const doConnect = async () => {
		if (closedIntentionally) return;
		if (internal.enabled === false) {
			setStatus("idle");
			return;
		}
		clearTimers();
		setStatus(reconnectAttempts === 0 ? "connecting" : "reconnecting");
		let url: string;
		try {
			url = await internal.getUrl();
		} catch (e) {
			internal.onError?.(e as Error);
			scheduleReconnect();
			return;
		}

		try {
			const nextWs = await createWebSocket(url);

			ws = nextWs;

			const onOpen = () => {
				reconnectAttempts = 0;
				lastPongAt = Date.now();
				setStatus("open");
				startHeartbeat();
			};

			const onMessage = (event: MessageEvent) => {
				try {
					const data = JSON.parse(event.data as string) as LiveMessage;
					if (data.type === "pong") {
						lastPongAt = Date.now();
					}
					internal.onMessage?.(data);
				} catch {
					// mensaje no JSON, ignorar
				}
			};

			const onClose = () => {
				cleanup();
				if (!closedIntentionally) {
					setStatus("closed");
					scheduleReconnect();
				} else {
					setStatus("closed");
				}
			};

			const onError = (ev: Event) => {
				internal.onError?.(ev);
				// onclose seguirá y programará reconnect
			};

			const cleanup = () => {
				if (heartbeatTimer) {
					clearInterval(heartbeatTimer);
					heartbeatTimer = null;
				}
				if (ws) {
					try {
						ws.removeEventListener("open", onOpen);
						ws.removeEventListener("message", onMessage);
						ws.removeEventListener("close", onClose);
						ws.removeEventListener("error", onError);
					} catch {}
				}
			};

			nextWs.addEventListener("open", onOpen);
			nextWs.addEventListener("message", onMessage);
			nextWs.addEventListener("close", onClose);
			nextWs.addEventListener("error", onError);

			// Si ya está abierto (Bun puede abrir sincrónicamente), disparar
			if (nextWs.readyState === WebSocket.OPEN) {
				onOpen();
			}
		} catch (e) {
			internal.onError?.(e as Error);
			setStatus("error");
			scheduleReconnect();
		}
	};

	// Auto-connect si enabled !== false y hay WebSocket disponible
	// SSR (Node sin WebSocket) no conecta; browser y Bun (WebSocket global) sí.
	const shouldAutoConnect =
		internal.enabled !== false &&
		(typeof window !== "undefined" || typeof WebSocket !== "undefined");
	if (shouldAutoConnect) {
		// defer para permitir que el caller asigne callbacks
		setTimeout(() => doConnect(), 0);
	} else {
		setStatus("idle");
	}

	// Listeners globales para reconexión
	let onVisibility: (() => void) | null = null;
	let onOnline: (() => void) | null = null;
	if (isBrowser()) {
		onVisibility = () => {
			if (document.visibilityState === "visible" && status === "reconnecting") {
				if (reconnectTimer) {
					clearTimeout(reconnectTimer);
					reconnectTimer = null;
				}
				doConnect();
			}
		};
		onOnline = () => {
			if (status === "reconnecting" || status === "closed") {
				doConnect();
			}
		};
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("online", onOnline);
	}

	return {
		getStatus: () => status,
		getRaw: () => ws,
		send: (data: unknown) => {
			if (!ws || ws.readyState !== WebSocket.OPEN) {
				throw new Error("WebSocket is not open");
			}
			const payload = typeof data === "string" ? data : JSON.stringify(data);
			ws.send(payload);
		},
		close: () => {
			closedIntentionally = true;
			clearTimers();
			if (isBrowser() && onVisibility) {
				document.removeEventListener("visibilitychange", onVisibility);
			}
			if (isBrowser() && onOnline) {
				window.removeEventListener("online", onOnline);
			}
			if (ws) {
				try {
					ws.close();
				} catch {}
				ws = null;
			}
			setStatus("closed");
		},
		reconnect: () => {
			closedIntentionally = false;
			reconnectAttempts = 0;
			if (ws) {
				try {
					ws.close();
				} catch {}
				ws = null;
			}
			clearTimers();
			doConnect();
		},
	};
}

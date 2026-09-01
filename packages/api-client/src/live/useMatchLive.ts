// @ts-nocheck

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { matchKeys, standingKeys } from "../queryKeys";
import { createMatchSocket, type ManagedSocket } from "./socket";
import type {
	LiveAckMessage,
	LiveConnectedMessage,
	LiveErrorMessage,
	LiveEventMessage,
	LiveMessage,
	LiveScoreMessage,
	LiveSendEventPayload,
	LiveSendScorePayload,
	LiveStatus,
	UseMatchLiveOptions,
} from "./types";

/**
 * Hook live para un partido: `ws://host/matches/:id/live`
 * Vía principal `?token=` con `getToken()` (re-evaluado en reconexión).
 * Gestiona `ManagedSocket` (reconexión, heartbeat 20s < idleTimeout 30s, visibility/online)
 * y opcionalmente actualiza TanStack Query cache (`updateCache:true`).
 *
 * SSR: `useEffect` no corre en servidor, por lo que no conecta en SSR.
 *
 * @example
 * ```tsx
 * const live = useMatchLive(matchId, {
 *   getToken: () => localStorage.getItem("accessToken"),
 *   onScore: (m) => console.log(m.payload),
 *   updateCache: true,
 * });
 * live.sendScore({ homeScore: 1, awayScore: 0, status: "in_progress" });
 * ```
 */
export function useMatchLive(
	matchId: string,
	options: UseMatchLiveOptions = {},
) {
	const {
		getToken,
		enabled = true,
		heartbeatInterval = 20_000,
		updateCache = true,
		baseUrl,
		onScore,
		onEvent,
		onAck,
		onError,
		onConnected,
	} = options;

	const qc = useQueryClient();
	const [status, setStatus] = useState<LiveStatus>("idle");
	const [lastMessage, setLastMessage] = useState<LiveMessage | null>(null);
	const [lastScore, setLastScore] = useState<LiveScoreMessage | null>(null);
	const [lastEvent, setLastEvent] = useState<LiveEventMessage | null>(null);
	const [lastAck, setLastAck] = useState<LiveAckMessage | null>(null);
	const [lastError, setLastError] = useState<LiveErrorMessage | null>(null);

	const socketRef = useRef<ManagedSocket | null>(null);
	const shouldConnect = Boolean(matchId) && enabled;

	const handleMessage = useCallback(
		(msg: LiveMessage) => {
			setLastMessage(msg);
			switch (msg.type) {
				case "connected":
					onConnected?.(msg as LiveConnectedMessage);
					break;
				case "score": {
					const m = msg as LiveScoreMessage;
					setLastScore(m);
					onScore?.(m);
					if (updateCache) {
						// Actualiza cache del partido y standings (service recalcula si finished)
						qc.setQueryData(matchKeys.detail(matchId), m.payload as any);
						qc.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
						qc.invalidateQueries({ queryKey: standingKeys.all() });
					}
					break;
				}
				case "event": {
					const m = msg as LiveEventMessage;
					setLastEvent(m);
					onEvent?.(m);
					if (updateCache) {
						qc.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
						qc.invalidateQueries({ queryKey: standingKeys.all() });
					}
					break;
				}
				case "ack": {
					const m = msg as LiveAckMessage;
					setLastAck(m);
					onAck?.(m);
					break;
				}
				case "error": {
					const m = msg as LiveErrorMessage;
					setLastError(m);
					onError?.(m);
					break;
				}
				case "pong":
					// heartbeat, ya manejado en socket
					break;
				default:
					break;
			}
		},
		[matchId, onScore, onEvent, onAck, onError, onConnected, qc, updateCache],
	);

	useEffect(() => {
		if (!shouldConnect) {
			setStatus("idle");
			return;
		}

		const socket = createMatchSocket(matchId, {
			getToken,
			baseUrl: baseUrl ?? null,
			heartbeatInterval,
			enabled: true,
			onMessage: handleMessage,
			onStatusChange: setStatus,
			onError: (e) => {
				// No propagar como LiveError, solo status
				// Los errores de WS se manejan vía onMessage {type:"error"} del servidor
			},
		});

		socketRef.current = socket;

		return () => {
			socket.close();
			socketRef.current = null;
		};
		// getToken puede ser nueva función cada render; usamos ref estable si cambia mucho
		// Para simplicidad, reconecta si getToken cambia (token rotado)
	}, [matchId, shouldConnect, heartbeatInterval, baseUrl, handleMessage]);

	const sendScore = useCallback((payload: LiveSendScorePayload) => {
		if (!socketRef.current) throw new Error("Socket not initialized");
		socketRef.current.send({ type: "score", payload });
	}, []);

	const sendEvent = useCallback((payload: LiveSendEventPayload) => {
		if (!socketRef.current) throw new Error("Socket not initialized");
		socketRef.current.send({ type: "event", payload });
	}, []);

	const reconnect = useCallback(() => {
		socketRef.current?.reconnect();
	}, []);

	return {
		status,
		lastMessage,
		lastScore,
		lastEvent,
		lastAck,
		lastError,
		sendScore,
		sendEvent,
		reconnect,
		socket: socketRef.current,
		isOpen: status === "open",
		isConnecting: status === "connecting" || status === "reconnecting",
	};
}

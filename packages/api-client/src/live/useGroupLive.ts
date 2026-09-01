// @ts-nocheck

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { standingKeys } from "../queryKeys";
import { createGroupSocket, type ManagedSocket } from "./socket";
import type {
	LiveConnectedMessage,
	LiveErrorMessage,
	LiveMessage,
	LiveStandingMessage,
	LiveStatus,
	UseGroupLiveOptions,
} from "./types";

/**
 * Hook live para standings de un grupo: `ws://host/groups/:groupId/live`
 * Solo lectura (servidor responde `Read-only channel` a cualquier `send`).
 * Vía principal `?token=` (opcional, lectura pública no requiere token).
 *
 * @example
 * ```tsx
 * const live = useGroupLive(groupId, {
 *   onStanding: (m) => console.log(m.payload),
 *   updateCache: true,
 * });
 * // live.status === "open"
 * ```
 */
export function useGroupLive(
	groupId: string,
	options: UseGroupLiveOptions = {},
) {
	const {
		getToken,
		enabled = true,
		heartbeatInterval = 20_000,
		updateCache = true,
		baseUrl,
		onStanding,
		onError,
		onConnected,
	} = options;

	const qc = useQueryClient();
	const [status, setStatus] = useState<LiveStatus>("idle");
	const [lastMessage, setLastMessage] = useState<LiveMessage | null>(null);
	const [lastStanding, setLastStanding] = useState<LiveStandingMessage | null>(
		null,
	);
	const [lastError, setLastError] = useState<LiveErrorMessage | null>(null);

	const socketRef = useRef<ManagedSocket | null>(null);
	const shouldConnect = Boolean(groupId) && enabled;

	const handleMessage = useCallback(
		(msg: LiveMessage) => {
			setLastMessage(msg);
			switch (msg.type) {
				case "connected":
					onConnected?.(msg as LiveConnectedMessage);
					break;
				case "standing": {
					const m = msg as LiveStandingMessage;
					setLastStanding(m);
					onStanding?.(m);
					if (updateCache) {
						qc.setQueryData(standingKeys.byGroup(groupId), m.payload as any);
						qc.invalidateQueries({ queryKey: standingKeys.byGroup(groupId) });
					}
					break;
				}
				case "error": {
					const m = msg as LiveErrorMessage;
					setLastError(m);
					onError?.(m);
					break;
				}
				case "pong":
					break;
				default:
					break;
			}
		},
		[groupId, onStanding, onError, onConnected, qc, updateCache],
	);

	useEffect(() => {
		if (!shouldConnect) {
			setStatus("idle");
			return;
		}

		const socket = createGroupSocket(groupId, {
			getToken,
			baseUrl: baseUrl ?? null,
			heartbeatInterval,
			enabled: true,
			onMessage: handleMessage,
			onStatusChange: setStatus,
		});

		socketRef.current = socket;

		return () => {
			socket.close();
			socketRef.current = null;
		};
	}, [groupId, shouldConnect, heartbeatInterval, baseUrl, handleMessage]);

	const reconnect = useCallback(() => {
		socketRef.current?.reconnect();
	}, []);

	return {
		status,
		lastMessage,
		lastStanding,
		lastError,
		reconnect,
		socket: socketRef.current,
		isOpen: status === "open",
		isConnecting: status === "connecting" || status === "reconnecting",
	};
}

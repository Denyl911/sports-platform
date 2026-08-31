/**
 * Tipos Live — Fase 2
 * Re-exporta `LiveMessage` del servidor como fuente de verdad,
 * añade utilidades de estado y opciones para `useMatchLive`/`useGroupLive`.
 */

// peerDependency ligera: `api` es `apps/api` vía workspace:*
// type-only, eliminado en build, sin impacto runtime
import type { LiveMessage as ServerLiveMessage } from "api/src/lib/live";

export type { ServerLiveMessage as LiveMessage };

/**
 * Mensajes Live tipados.
 * Se re-exporta para que web/mobile no importen desde `apps/api`.
 */
export type LiveScoreMessage = Extract<ServerLiveMessage, { type: "score" }>;
export type LiveEventMessage = Extract<ServerLiveMessage, { type: "event" }>;
export type LiveStandingMessage = Extract<
	ServerLiveMessage,
	{ type: "standing" }
>;
export type LiveConnectedMessage = Extract<
	ServerLiveMessage,
	{ type: "connected" }
>;
export type LiveAckMessage = Extract<ServerLiveMessage, { type: "ack" }>;
export type LivePongMessage = Extract<ServerLiveMessage, { type: "pong" }>;
export type LiveErrorMessage = Extract<ServerLiveMessage, { type: "error" }>;

/**
 * Estado de la conexión WS gestionada.
 */
export type LiveStatus = "idle" | "connecting" | "open" | "reconnecting" | "closed" | "error";

/**
 * Opciones comunes para hooks live.
 * - `getToken`: fuente principal `?token=` (vía principal acordada).
 *              Puede rotar tras refresh; se re-evalúa en cada reconexión.
 * - `enabled`: `typeof window !== "undefined"` guard ya aplicado por defecto (SSR).
 * - `heartbeatInterval`: ms entre `ping` (default 20_000 < idleTimeout 30s).
 * - `updateCache`: si true, el hook invalida/muta TanStack Query cache automáticamente.
 */
export interface LiveOptions {
	getToken?: () => string | null | undefined | Promise<string | null | undefined>;
	enabled?: boolean;
	heartbeatInterval?: number;
	updateCache?: boolean;
	baseUrl?: string | (() => string);
}

/**
 * Opciones específicas `useMatchLive`.
 */
export interface UseMatchLiveOptions extends LiveOptions {
	onScore?: (msg: LiveScoreMessage) => void;
	onEvent?: (msg: LiveEventMessage) => void;
	onAck?: (msg: LiveAckMessage) => void;
	onError?: (msg: LiveErrorMessage) => void;
	onConnected?: (msg: LiveConnectedMessage) => void;
}

/**
 * Opciones específicas `useGroupLive` (solo lectura).
 */
export interface UseGroupLiveOptions extends LiveOptions {
	onStanding?: (msg: LiveStandingMessage) => void;
	onError?: (msg: LiveErrorMessage) => void;
	onConnected?: (msg: LiveConnectedMessage) => void;
}

/**
 * Payloads para envío (solo `useMatchLive`, requiere referee).
 */
export type LiveSendScorePayload = {
	homeScore: number;
	awayScore: number;
	status: string;
	winnerTeamId?: string | null;
	periodNumber?: number;
	periodType?: string;
};

export type LiveSendEventPayload = {
	teamId: string;
	eventType: string;
	periodNumber: number;
	minuteOrSecond: number;
	playerId?: string;
	assistPlayerId?: string;
	eventValue?: number;
	metadata?: Record<string, unknown>;
};

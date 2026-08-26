import type { ServerWebSocket } from "bun";

// Mensaje en vivo enviado a suscriptores
export type LiveMessage =
	| { type: "score"; matchId: string; payload: unknown }
	| { type: "event"; matchId: string; payload: unknown }
	| { type: "standing"; groupId: string; payload: unknown }
	| { type: "connected"; channel: string }
	| { type: "error"; message: string };

// Mapas en memoria: topic → Set de sockets
const matchClients = new Map<string, Set<ServerWebSocket<unknown>>>();
const groupClients = new Map<string, Set<ServerWebSocket<unknown>>>();

function getOrCreate<K, V>(map: Map<K, Set<V>>, key: K): Set<V> {
	let set = map.get(key);
	if (!set) {
		set = new Set<V>();
		map.set(key, set);
	}
	return set;
}

// Matches
export function subscribeMatch(matchId: string, ws: ServerWebSocket<unknown>) {
	getOrCreate(matchClients, matchId).add(ws);
}

export function unsubscribeMatch(
	matchId: string,
	ws: ServerWebSocket<unknown>,
) {
	matchClients.get(matchId)?.delete(ws);
}

export function publishMatch(matchId: string, message: LiveMessage) {
	const clients = matchClients.get(matchId);
	if (!clients?.size) return;
	const data = JSON.stringify(message);
	for (const ws of clients) {
		try {
			ws.send(data);
		} catch {
			// cliente ya cerrado
		}
	}
}

// Standings por grupo
export function subscribeGroup(groupId: string, ws: ServerWebSocket<unknown>) {
	getOrCreate(groupClients, groupId).add(ws);
}

export function unsubscribeGroup(
	groupId: string,
	ws: ServerWebSocket<unknown>,
) {
	groupClients.get(groupId)?.delete(ws);
}

export function publishGroup(groupId: string, message: LiveMessage) {
	const clients = groupClients.get(groupId);
	if (!clients?.size) return;
	const data = JSON.stringify(message);
	for (const ws of clients) {
		try {
			ws.send(data);
		} catch {}
	}
}

// Utilitario para tests: limpiar y consultar
export function _clearAll() {
	matchClients.clear();
	groupClients.clear();
}

export function _matchClientCount(matchId: string): number {
	return matchClients.get(matchId)?.size ?? 0;
}

export function _groupClientCount(groupId: string): number {
	return groupClients.get(groupId)?.size ?? 0;
}

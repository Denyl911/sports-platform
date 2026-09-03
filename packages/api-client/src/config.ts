/**
 * Resolución de baseUrl para el cliente Eden Treaty.
 * Prioridad:
 * 1. `override` explícito (string o función)
 * 2. `import.meta.env.VITE_API_URL` (Vite / TanStack Start)
 * 3. `process.env` (NEXT_PUBLIC_API_URL | VITE_API_URL | API_URL)
 * 4. Fallback dev `http://localhost:3000` (resolvePort default en apps/api)
 */

// Declarado aquí (no en un .d.ts aparte) para que aplique en cualquier
// programa que importe este archivo (apps/web no incluye .d.ts no importados).
declare global {
	var __viteEnv: Record<string, string> | undefined;
}

export function resolveBaseUrl(
	override?: string | (() => string) | null,
): string {
	if (override) {
		const value = typeof override === "function" ? override() : override;
		if (value) return normalizeUrl(value);
	}

	// Vite / TanStack Start (SSR y CSR)
	// `import.meta.env` existe en Vite, no en Bun/Node; acceso seguro.
	// Tipos declarados en `src/vite-env.d.ts` (sin depender de `vite/client`).
	try {
		const viteEnv =
			globalThis.__viteEnv ??
			(typeof import.meta !== "undefined" ? import.meta.env : undefined);
		if (viteEnv?.VITE_API_URL) return normalizeUrl(viteEnv.VITE_API_URL);
	} catch {
		// ignore
	}

	// Fallback a `process.env` (Bun, Node, Next.js, Tauri)
	const env =
		typeof process !== "undefined"
			? (process.env as Record<string, string | undefined>)
			: {};
	const fromProcess =
		env.VITE_API_URL ??
		env.NEXT_PUBLIC_API_URL ??
		env.API_URL ??
		env.PUBLIC_API_URL;

	if (fromProcess) return normalizeUrl(fromProcess);

	return "http://localhost:3000";
}

function normalizeUrl(url: string): string {
	// Elimina trailing slash para que treaty lo concatene correctamente con los prefijos
	return url.replace(/\/+$/, "");
}

/**
 * Helper para obtener headers por defecto (útil en SSR donde no hay localStorage)
 */
export function getDefaultApiUrl(): string {
	return resolveBaseUrl();
}

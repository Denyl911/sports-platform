/**
 * Resolución de baseUrl para el cliente Eden Treaty.
 * Prioridad:
 * 1. `override` explícito (string o función)
 * 2. `import.meta.env.VITE_API_URL` (Vite / TanStack Start)
 * 3. `process.env` (NEXT_PUBLIC_API_URL | VITE_API_URL | API_URL)
 * 4. Fallback dev `http://localhost:3000` (resolvePort default en apps/api)
 */

export function resolveBaseUrl(
	override?: string | (() => string) | null,
): string {
	if (override) {
		const value = typeof override === "function" ? override() : override;
		if (value) return normalizeUrl(value);
	}

	// Vite / TanStack Start (SSR y CSR)
	// `import.meta.env` existe en Vite, no en Bun/Node; acceso seguro
	try {
		// @ts-ignore - import.meta puede no estar tipado en este contexto
		const viteEnv = (globalThis as unknown as { __viteEnv?: Record<string, string> }).__viteEnv ??
			// @ts-ignore
			(typeof import.meta !== "undefined" ? (import.meta as unknown as { env?: Record<string, string> }).env : undefined);
		if (viteEnv?.VITE_API_URL) return normalizeUrl(viteEnv.VITE_API_URL);
	} catch {
		// ignore
	}

	// Fallback a `process.env` (Bun, Node, Next.js, Tauri)
	const env = typeof process !== "undefined" ? (process.env as Record<string, string | undefined>) : {};
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

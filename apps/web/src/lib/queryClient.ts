import { QueryClient } from "@tanstack/react-query";

let browserClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
	if (typeof window === "undefined") {
		// SSR: siempre nueva instancia por request
		return createQueryClient();
	}
	if (browserClient) return browserClient;
	browserClient = createQueryClient();
	return browserClient;
}

// Para tests / SSR con instancia aislada
export function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30 * 1000,
				gcTime: 5 * 60 * 1000,
				retry: 1,
				refetchOnWindowFocus: false,
			},
			mutations: { retry: 0 },
		},
	});
}

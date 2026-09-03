import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "@tanstack/react-router";
import * as React from "react";
import { getQueryClient } from "../lib/queryClient";

export function AppProviders({ children }: { children: React.ReactNode }) {
	let routerQueryClient: ReturnType<typeof getQueryClient> | undefined;
	try {
		// biome-ignore lint/correctness/useHookAtTopLevel: safe fallback when rendered outside RouterProvider
		const router = useRouter({ warn: false } as never) as unknown as {
			options?: {
				context?: { queryClient?: ReturnType<typeof getQueryClient> };
			};
		};
		routerQueryClient = router?.options?.context?.queryClient;
	} catch {}
	const [queryClient] = React.useState(
		() => routerQueryClient ?? getQueryClient(),
	);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{import.meta.env.DEV && (
				<ReactQueryDevtools
					initialIsOpen={false}
					buttonPosition="bottom-left"
				/>
			)}
		</QueryClientProvider>
	);
}

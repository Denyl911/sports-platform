import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import * as React from "react";
import { getQueryClient } from "../lib/queryClient";

export function AppProviders({ children }: { children: React.ReactNode }) {
	const [queryClient] = React.useState(() => getQueryClient());

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

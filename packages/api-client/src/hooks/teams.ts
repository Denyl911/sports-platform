// @ts-nocheck
import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type ApiClient, unwrap } from "../client";
import { queryKeys } from "../queryKeys";

export function useTeams(
	client: ApiClient,
	filters?: Record<string, unknown>,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.teams.list(filters),
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.teams.get({ query: (filters ?? {}) as never }),
			),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useTeam(
	client: ApiClient,
	id: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.teams.detail(id),
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.teams({ id }).get(),
			),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateTeam(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, Record<string, unknown>>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			unwrap(client.teams.post(body as never)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.teams.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useUpdateTeam(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ id: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }) =>
			unwrap(
				// @ts-expect-error
				client.teams({ id }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.teams.all() });
			qc.invalidateQueries({ queryKey: queryKeys.teams.detail(vars.id) });
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});
}

export function useDeleteTeam(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(
				// @ts-expect-error
				client.teams({ id }).delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.teams.all() });
			options?.onSuccess?.(...args);
		},
	});
}

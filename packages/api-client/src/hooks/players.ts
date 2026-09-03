import type {
	InsertPlayer,
	PlayerSearchQuery,
	UpdatePlayer,
} from "@sports/schemas";
import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type ApiClient, unwrap } from "../client";
import { queryKeys } from "../queryKeys";

export function usePlayers(
	client: ApiClient,
	search?: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	const query: PlayerSearchQuery = search ? { search } : {};
	return useQuery({
		queryKey: queryKeys.players.list(search),
		queryFn: () => unwrap(client.players.get({ query })),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function usePlayer(
	client: ApiClient,
	id: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.players.detail(id),
		queryFn: () => unwrap(client.players({ id }).get()),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreatePlayer(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, InsertPlayer>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: InsertPlayer) => unwrap(client.players.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.players.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdatePlayer(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdatePlayer }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdatePlayer }) =>
			unwrap(client.players({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.players.all() });
			qc.invalidateQueries({ queryKey: queryKeys.players.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useDeletePlayer(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(client.players({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.players.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

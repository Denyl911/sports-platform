import type { InsertTeam, TeamFilterQuery, UpdateTeam } from "@sports/schemas";
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
	filters?: TeamFilterQuery,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.teams.list(filters),
		queryFn: () => unwrap(client.teams.get({ query: { ...(filters ?? {}) } })),
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
		queryFn: () => unwrap(client.teams({ id }).get()),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateTeam(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, InsertTeam>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: InsertTeam) => unwrap(client.teams.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.teams.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateTeam(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdateTeam }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateTeam }) =>
			unwrap(client.teams({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.teams.all() });
			qc.invalidateQueries({ queryKey: queryKeys.teams.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
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
			unwrap(client.teams({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.teams.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

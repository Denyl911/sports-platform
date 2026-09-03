import type { InsertClub, UpdateClub } from "@sports/schemas";
import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type ApiClient, unwrap } from "../client";
import { queryKeys } from "../queryKeys";

export function useClubs(
	client: ApiClient,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.clubs.lists(),
		queryFn: () => unwrap(client.clubs.get()),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useClub(
	client: ApiClient,
	id: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.clubs.detail(id),
		queryFn: () => unwrap(client.clubs({ id }).get()),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateClub(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, InsertClub>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: InsertClub) => unwrap(client.clubs.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.clubs.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateClub(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdateClub }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateClub }) =>
			unwrap(client.clubs({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.clubs.all() });
			qc.invalidateQueries({ queryKey: queryKeys.clubs.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useDeleteClub(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(client.clubs({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.clubs.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

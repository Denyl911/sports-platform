// @ts-nocheck
import {
	useMutation,
	useQuery,
	useQueryClient,
	type UseMutationOptions,
	type UseQueryOptions,
} from "@tanstack/react-query";
import { unwrap, type ApiClient } from "../client";
import { queryKeys } from "../queryKeys";

export function useClubs(
	client: ApiClient,
	options?: Omit<UseQueryOptions<unknown, Error, unknown, readonly unknown[]>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: queryKeys.clubs.lists(),
		queryFn: () => unwrap(client.clubs.get()),
		...(options as unknown as object ?? {} as object),
	});
}

export function useClub(
	client: ApiClient,
	id: string,
	options?: Omit<UseQueryOptions<unknown, Error, unknown, readonly unknown[]>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: queryKeys.clubs.detail(id),
		queryFn: () =>
			unwrap(
				// @ts-ignore
				client.clubs({ id }).get(),
			),
		enabled: !!id && options?.enabled !== false,
		...(options as unknown as object ?? {} as object),
	});
}

export function useCreateClub(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, Record<string, unknown>>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) => unwrap(client.clubs.post(body as never)),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.clubs.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useUpdateClub(
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
				// @ts-ignore
				client.clubs({ id }).patch(body as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.clubs.all() });
			qc.invalidateQueries({ queryKey: queryKeys.clubs.detail(vars.id) });
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});;
}

export function useDeleteClub(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, string>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(
				// @ts-ignore
				client.clubs({ id }).delete(undefined as never, undefined as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.clubs.all() });
			options?.onSuccess?.(...args);
		},
	});;
}

import type {
	InsertVenue,
	UpdateVenue,
	VenueFilterQuery,
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

export function useVenues(
	client: ApiClient,
	filters?: VenueFilterQuery,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.venues.list(filters),
		queryFn: () => unwrap(client.venues.get({ query: { ...(filters ?? {}) } })),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useVenue(
	client: ApiClient,
	id: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.venues.detail(id),
		queryFn: () => unwrap(client.venues({ id }).get()),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateVenue(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, InsertVenue>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: InsertVenue) => unwrap(client.venues.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.venues.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateVenue(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdateVenue }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateVenue }) =>
			unwrap(client.venues({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.venues.all() });
			qc.invalidateQueries({ queryKey: queryKeys.venues.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useDeleteVenue(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(client.venues({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.venues.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

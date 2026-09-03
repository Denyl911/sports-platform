import type {
	InsertSport,
	InsertSportEventType,
	SportEventTypeFilterQuery,
	UpdateSport,
	UpdateSportEventType,
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

// ---------------------------------------------------------------------------
// Sports
// ---------------------------------------------------------------------------

export function useSports(
	client: ApiClient,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.sports.lists(),
		queryFn: () => unwrap(client.sports.get()),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useSport(
	client: ApiClient,
	id: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.sports.detail(id),
		queryFn: () => unwrap(client.sports({ id }).get()),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useSportEventTypes(
	client: ApiClient,
	sportId: string,
	filters?: SportEventTypeFilterQuery,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.sports.eventTypes(sportId),
		queryFn: () =>
			unwrap(
				client.sports({ id: sportId })["event-types"].get({
					query: { sportId, ...(filters ?? {}) },
				}),
			),
		enabled: !!sportId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateSport(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, InsertSport>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: InsertSport) => unwrap(client.sports.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateSport(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdateSport }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateSport }) =>
			unwrap(client.sports({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			qc.invalidateQueries({ queryKey: queryKeys.sports.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useDeleteSport(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(client.sports({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useCreateSportEventType(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ sportId: string; body: InsertSportEventType }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			sportId,
			body,
		}: {
			sportId: string;
			body: InsertSportEventType;
		}) => unwrap(client.sports({ id: sportId })["event-types"].post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.sports.eventTypes(vars.sportId),
			});
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useUpdateSportEventType(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ eventTypeId: string; body: UpdateSportEventType }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			eventTypeId,
			body,
		}: {
			eventTypeId: string;
			body: UpdateSportEventType;
		}) => unwrap(client.sports["event-types"]({ eventTypeId }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useDeleteSportEventType(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (eventTypeId: string) =>
			unwrap(
				client.sports["event-types"]({ eventTypeId }).delete(
					undefined,
					undefined,
				),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

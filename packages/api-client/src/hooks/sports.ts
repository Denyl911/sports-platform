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
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.sports({ id }).get(),
			),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useSportEventTypes(
	client: ApiClient,
	sportId: string,
	filters?: Record<string, unknown>,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.sports.eventTypes(sportId),
		queryFn: () =>
			unwrap(
				// @ts-expect-error GET /sports/:id/event-types
				client.sports({ id: sportId })["event-types"].get({
					query: (filters ?? {}) as never,
				}),
			),
		enabled: !!sportId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateSport(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, Record<string, unknown>>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			unwrap(client.sports.post(body as never)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useUpdateSport(
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
				client.sports({ id }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			qc.invalidateQueries({ queryKey: queryKeys.sports.detail(vars.id) });
			(options?.onSuccess as never)?.(data, vars, ...rest);
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
			unwrap(
				// @ts-expect-error
				client.sports({ id }).delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useCreateSportEventType(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ sportId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ sportId, body }) =>
			unwrap(
				// @ts-expect-error POST /sports/:id/event-types
				client.sports({ id: sportId })["event-types"].post(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({
				queryKey: queryKeys.sports.eventTypes(vars.sportId),
			});
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});
}

export function useUpdateSportEventType(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ eventTypeId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ eventTypeId, body }) =>
			unwrap(
				// @ts-expect-error PATCH /sports/event-types/:eventTypeId
				client.sports["event-types"]({ eventTypeId }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(...args);
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
				// @ts-expect-error DELETE /sports/event-types/:eventTypeId
				client.sports["event-types"]({ eventTypeId }).delete(
					undefined as never,
					undefined as never,
				),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.sports.all() });
			options?.onSuccess?.(...args);
		},
	});
}

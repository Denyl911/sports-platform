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

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useMatches(
	client: ApiClient,
	filters?: Record<string, unknown>,
	options?: Omit<UseQueryOptions<unknown, Error, unknown, readonly unknown[]>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: queryKeys.matches.list(filters),
		queryFn: () =>
			unwrap(
				// @ts-ignore treaty query
				client.matches.get({ query: (filters ?? {}) as never }),
			),
		...(options as unknown as object ?? {} as object),
	});
}

export function useMatch(
	client: ApiClient,
	id: string,
	options?: Omit<UseQueryOptions<unknown, Error, unknown, readonly unknown[]>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: queryKeys.matches.detail(id),
		queryFn: () =>
			unwrap(
				// @ts-ignore
				client.matches({ id }).get(),
			),
		enabled: !!id && options?.enabled !== false,
		...(options as unknown as object ?? {} as object),
	});
}

// ---------------------------------------------------------------------------
// Mutations — CRUD
// ---------------------------------------------------------------------------

export function useCreateMatch(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, Record<string, unknown>>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			unwrap(client.matches.post(body as never)),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useUpdateMatch(
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
				client.matches({ id }).patch(body as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.all() });
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});;
}

export function useDeleteMatch(
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
				// @ts-ignore Eden delete
				client.matches({ id }).delete(undefined as never, undefined as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.all() });
			options?.onSuccess?.(...args);
		},
	});;
}

// ---------------------------------------------------------------------------
// Mutations — venue / schedule (organizer)
// ---------------------------------------------------------------------------

export function useAssignVenue(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ id: string; venueId: string }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, venueId }) =>
			unwrap(
				// @ts-ignore
				client.matches({ id }).venue.patch({ venueId } as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});;
}

export function useScheduleMatch(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ id: string; scheduledAt: string }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, scheduledAt }) =>
			unwrap(
				// @ts-ignore
				client.matches({ id }).schedule.patch({ scheduledAt } as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});;
}

// ---------------------------------------------------------------------------
// Mutations — live score / events (referee)
// Al finalizar, recalcula standings e invalida group standings
// ---------------------------------------------------------------------------

export function useUpdateMatchScore(
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
				client.matches({ id }).score.patch(body as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			qc.invalidateQueries({ queryKey: queryKeys.matches.lists() });
			// standings se recalcula en service si finished/walkover + groupId
			qc.invalidateQueries({ queryKey: queryKeys.standings.all() });
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});;
}

export function useRecordLiveEvent(
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
				client.matches({ id }).events.post(body as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			qc.invalidateQueries({ queryKey: queryKeys.standings.all() });
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});;
}

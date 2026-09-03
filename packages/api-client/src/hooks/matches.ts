import type {
	CreateMatch,
	MatchFilterQuery,
	MatchScheduleUpdate,
	MatchVenueUpdate,
	RecordLiveEvent,
	UpdateMatchInfo,
	UpdateMatchScore,
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
// Queries
// ---------------------------------------------------------------------------

export function useMatches(
	client: ApiClient,
	filters?: MatchFilterQuery,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.matches.list(filters),
		queryFn: () =>
			unwrap(client.matches.get({ query: { ...(filters ?? {}) } })),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useMatch(
	client: ApiClient,
	id: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.matches.detail(id),
		queryFn: () => unwrap(client.matches({ id }).get()),
		enabled: !!id && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

// ---------------------------------------------------------------------------
// Mutations — CRUD
// ---------------------------------------------------------------------------

export function useCreateMatch(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, CreateMatch>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateMatch) => unwrap(client.matches.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateMatch(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdateMatchInfo }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateMatchInfo }) =>
			unwrap(client.matches({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.all() });
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useDeleteMatch(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(client.matches({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

// ---------------------------------------------------------------------------
// Mutations — venue / schedule (organizer)
// ---------------------------------------------------------------------------

export function useAssignVenue(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string } & MatchVenueUpdate>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: string;
			venueId: MatchVenueUpdate["venueId"];
		}) => unwrap(client.matches({ id }).venue.patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useScheduleMatch(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string } & MatchScheduleUpdate>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			...body
		}: {
			id: string;
			scheduledAt: MatchScheduleUpdate["scheduledAt"];
		}) => unwrap(client.matches({ id }).schedule.patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

// ---------------------------------------------------------------------------
// Mutations — live score / events (referee)
// Al finalizar, recalcula standings e invalida group standings
// ---------------------------------------------------------------------------

export function useUpdateMatchScore(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdateMatchScore }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateMatchScore }) =>
			unwrap(client.matches({ id }).score.patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			qc.invalidateQueries({ queryKey: queryKeys.matches.lists() });
			// standings se recalcula en service si finished/walkover + groupId
			qc.invalidateQueries({ queryKey: queryKeys.standings.all() });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useRecordLiveEvent(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: RecordLiveEvent }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: RecordLiveEvent }) =>
			unwrap(client.matches({ id }).events.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.matches.detail(vars.id) });
			qc.invalidateQueries({ queryKey: queryKeys.standings.all() });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

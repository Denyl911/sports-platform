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

type TournamentFilter = { sportId?: string };

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTournaments(
	client: ApiClient,
	filters?: TournamentFilter,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.tournaments.list(filters as Record<string, unknown>),
		queryFn: () =>
			unwrap(
				// @ts-expect-error treaty query serialización
				client.tournaments.get({ query: (filters ?? {}) as never }),
			),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useTournament(
	client: ApiClient,
	tournamentId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.tournaments.detail(tournamentId),
		queryFn: () =>
			unwrap(
				// @ts-expect-error treaty param
				client.tournaments({ tournamentId }).get(),
			),
		enabled: !!tournamentId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useTournamentEditions(
	client: ApiClient,
	tournamentId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.editions.listByTournament(tournamentId),
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.tournaments({ tournamentId }).editions.get(),
			),
		enabled: !!tournamentId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useStagesByEdition(
	client: ApiClient,
	editionId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.stages.listByEdition(editionId),
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.tournaments.editions({ editionId }).stages.get(),
			),
		enabled: !!editionId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useGroupsByStage(
	client: ApiClient,
	stageId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.groups.listByStage(stageId),
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.tournaments.stages({ stageId }).groups.get(),
			),
		enabled: !!stageId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

// ---------------------------------------------------------------------------
// Mutations — Tournaments
// ---------------------------------------------------------------------------

export function useCreateTournament(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, Record<string, unknown>>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			unwrap(client.tournaments.post(body as never)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.tournaments.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useUpdateTournament(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ tournamentId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ tournamentId, body }) =>
			unwrap(
				// @ts-expect-error
				client.tournaments({ tournamentId }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.tournaments.all() });
			qc.invalidateQueries({
				queryKey: queryKeys.tournaments.detail(vars.tournamentId),
			});
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});
}

export function useDeleteTournament(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (tournamentId: string) =>
			unwrap(
				// @ts-expect-error Eden delete: primer arg es data (undefined)
				client
					.tournaments({ tournamentId })
					.delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.tournaments.all() });
			options?.onSuccess?.(...args);
		},
	});
}

// ---------------------------------------------------------------------------
// Editions / Stages / Groups mutations (organizer)
// ---------------------------------------------------------------------------

export function useCreateEdition(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ tournamentId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ tournamentId, body }) =>
			unwrap(
				// @ts-expect-error
				client.tournaments({ tournamentId }).editions.post(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({
				queryKey: queryKeys.editions.listByTournament(vars.tournamentId),
			});
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});
}

export function useUpdateEdition(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ editionId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ editionId, body }) =>
			unwrap(
				// @ts-expect-error
				client.tournaments.editions({ editionId }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.editions.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useDeleteEdition(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (editionId: string) =>
			unwrap(
				// @ts-expect-error
				client.tournaments
					.editions({ editionId })
					.delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.editions.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useCreateStage(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ editionId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ editionId, body }) =>
			unwrap(
				// @ts-expect-error
				client.tournaments.editions({ editionId }).stages.post(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({
				queryKey: queryKeys.stages.listByEdition(vars.editionId),
			});
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});
}

export function useUpdateStage(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ stageId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ stageId, body }) =>
			unwrap(
				// @ts-expect-error
				client.tournaments.stages({ stageId }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.stages.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useDeleteStage(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (stageId: string) =>
			unwrap(
				// @ts-expect-error
				client.tournaments
					.stages({ stageId })
					.delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.stages.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useCreateGroup(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ stageId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ stageId, body }) =>
			unwrap(
				// @ts-expect-error
				client.tournaments.stages({ stageId }).groups.post(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({
				queryKey: queryKeys.groups.listByStage(vars.stageId),
			});
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});
}

export function useUpdateGroup(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ groupId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ groupId, body }) =>
			unwrap(
				// @ts-expect-error
				client.tournaments.groups({ groupId }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useDeleteGroup(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (groupId: string) =>
			unwrap(
				// @ts-expect-error
				client.tournaments
					.groups({ groupId })
					.delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useMyTournamentMembership(
	client: ApiClient,
	tournamentId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.memberships.myMembership(tournamentId),
		queryFn: () =>
			unwrap(
				// @ts-expect-error treaty nested members/me
				client.tournaments({ tournamentId }).members.me.get(),
			),
		enabled: !!tournamentId && options?.enabled !== false,
		retry: false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

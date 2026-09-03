import type {
	InsertStageGroup,
	InsertTournament,
	InsertTournamentEdition,
	InsertTournamentStage,
	TournamentFilterQuery,
	UpdateStageGroup,
	UpdateTournament,
	UpdateTournamentEdition,
	UpdateTournamentStage,
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

// Los POST anidados omiten el id del padre (va en la ruta):
// POST /tournaments/:id/editions, POST /editions/:id/stages, POST /stages/:id/groups
type CreateEditionBody = Omit<InsertTournamentEdition, "tournamentId">;
type CreateStageBody = Omit<InsertTournamentStage, "editionId">;
type CreateGroupBody = Omit<InsertStageGroup, "stageId">;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTournaments(
	client: ApiClient,
	filters?: TournamentFilterQuery,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.tournaments.list(filters),
		queryFn: () =>
			unwrap(client.tournaments.get({ query: { ...(filters ?? {}) } })),
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
		queryFn: () => unwrap(client.tournaments({ tournamentId }).get()),
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
		queryFn: () => unwrap(client.tournaments({ tournamentId }).editions.get()),
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
			unwrap(client.tournaments.editions({ editionId }).stages.get()),
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
		queryFn: () => unwrap(client.tournaments.stages({ stageId }).groups.get()),
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
		UseMutationOptions<unknown, Error, InsertTournament>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: InsertTournament) =>
			unwrap(client.tournaments.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.tournaments.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateTournament(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ tournamentId: string; body: UpdateTournament }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			tournamentId,
			body,
		}: {
			tournamentId: string;
			body: UpdateTournament;
		}) => unwrap(client.tournaments({ tournamentId }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.tournaments.all() });
			qc.invalidateQueries({
				queryKey: queryKeys.tournaments.detail(vars.tournamentId),
			});
			options?.onSuccess?.(data, vars, onMutateResult, context);
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
			unwrap(client.tournaments({ tournamentId }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.tournaments.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
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
			{ tournamentId: string; body: CreateEditionBody }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			tournamentId,
			body,
		}: {
			tournamentId: string;
			body: CreateEditionBody;
		}) => unwrap(client.tournaments({ tournamentId }).editions.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.editions.listByTournament(vars.tournamentId),
			});
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useUpdateEdition(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ editionId: string; body: UpdateTournamentEdition }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			editionId,
			body,
		}: {
			editionId: string;
			body: UpdateTournamentEdition;
		}) => unwrap(client.tournaments.editions({ editionId }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.editions.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
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
				client.tournaments.editions({ editionId }).delete(undefined, undefined),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.editions.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useCreateStage(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ editionId: string; body: CreateStageBody }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			editionId,
			body,
		}: {
			editionId: string;
			body: CreateStageBody;
		}) => unwrap(client.tournaments.editions({ editionId }).stages.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.stages.listByEdition(vars.editionId),
			});
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useUpdateStage(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ stageId: string; body: UpdateTournamentStage }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			stageId,
			body,
		}: {
			stageId: string;
			body: UpdateTournamentStage;
		}) => unwrap(client.tournaments.stages({ stageId }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.stages.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
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
				client.tournaments.stages({ stageId }).delete(undefined, undefined),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.stages.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useCreateGroup(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ stageId: string; body: CreateGroupBody }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			stageId,
			body,
		}: {
			stageId: string;
			body: CreateGroupBody;
		}) => unwrap(client.tournaments.stages({ stageId }).groups.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.groups.listByStage(vars.stageId),
			});
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useUpdateGroup(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ groupId: string; body: UpdateStageGroup }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			groupId,
			body,
		}: {
			groupId: string;
			body: UpdateStageGroup;
		}) => unwrap(client.tournaments.groups({ groupId }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
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
				client.tournaments.groups({ groupId }).delete(undefined, undefined),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
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
			unwrap(client.tournaments({ tournamentId }).members.me.get()),
		enabled: !!tournamentId && options?.enabled !== false,
		retry: false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

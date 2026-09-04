import type {
	AddTournamentMember,
	UpdateTournamentMemberRole,
	UpdateUser,
	UserCreate,
	UserFilterQuery,
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

export function useUsers(
	client: ApiClient,
	filters?: UserFilterQuery,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.users.list(filters),
		queryFn: () => unwrap(client.users.get({ query: { ...(filters ?? {}) } })),
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useUser(
	client: ApiClient,
	userId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.users.detail(userId),
		queryFn: () => unwrap(client.users({ userId }).get()),
		enabled: !!userId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useMembershipsByUser(
	client: ApiClient,
	userId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.memberships.byUser(userId),
		queryFn: () => unwrap(client.users({ userId }).memberships.get()),
		enabled: !!userId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export type TournamentMemberRoleFilter =
	| "organizer"
	| "referee"
	| "statistician"
	| "viewer_staff";

export function useTournamentMembers(
	client: ApiClient,
	tournamentId: string,
	filters?: { role?: TournamentMemberRoleFilter },
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.memberships.byTournament(tournamentId, filters),
		queryFn: () =>
			unwrap(
				client
					.tournaments({ tournamentId })
					.members.get({ query: { ...(filters ?? {}) } }),
			),
		enabled: !!tournamentId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateUser(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, UserCreate>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: UserCreate) => unwrap(client.users.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateUser(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { userId: string; body: UpdateUser }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, body }: { userId: string; body: UpdateUser }) =>
			unwrap(client.users({ userId }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			qc.invalidateQueries({ queryKey: queryKeys.users.detail(vars.userId) });
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useDeleteUser(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (userId: string) =>
			unwrap(client.users({ userId }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

// ---------------------------------------------------------------------------
// Memberships (tournament roles)
// ---------------------------------------------------------------------------

export function useAddTournamentMember(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ userId: string; body: AddTournamentMember }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			userId,
			body,
		}: {
			userId: string;
			body: AddTournamentMember;
		}) => unwrap(client.users({ userId }).memberships.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.memberships.all() });
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUpdateMembershipRole(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ memberId: string; body: UpdateTournamentMemberRole }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			memberId,
			body,
		}: {
			memberId: string;
			body: UpdateTournamentMemberRole;
		}) => unwrap(client.memberships({ memberId }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.memberships.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useRemoveMembership(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (memberId: string) =>
			unwrap(client.memberships({ memberId }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.memberships.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

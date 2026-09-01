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

export function useUsers(
	client: ApiClient,
	filters?: Record<string, unknown>,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.users.list(filters),
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.users.get({ query: (filters ?? {}) as never }),
			),
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
		queryFn: () =>
			unwrap(
				// @ts-expect-error
				client.users({ userId }).get(),
			),
		enabled: !!userId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useCreateUser(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, Record<string, unknown>>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: Record<string, unknown>) =>
			unwrap(client.users.post(body as never)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useUpdateUser(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ userId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, body }) =>
			unwrap(
				// @ts-expect-error
				client.users({ userId }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			qc.invalidateQueries({ queryKey: queryKeys.users.detail(vars.userId) });
			(options?.onSuccess as never)?.(data, vars, ...rest);
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
			unwrap(
				// @ts-expect-error
				client.users({ userId }).delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			options?.onSuccess?.(...args);
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
			{ userId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, body }) =>
			unwrap(
				// @ts-expect-error POST /users/:userId/memberships
				client.users({ userId }).memberships.post(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.memberships.all() });
			qc.invalidateQueries({ queryKey: queryKeys.users.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useUpdateMembershipRole(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ memberId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ memberId, body }) =>
			unwrap(
				// @ts-expect-error PATCH /memberships/:memberId
				client.memberships({ memberId }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.memberships.all() });
			options?.onSuccess?.(...args);
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
			unwrap(
				// @ts-expect-error
				client
					.memberships({ memberId })
					.delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.memberships.all() });
			options?.onSuccess?.(...args);
		},
	});
}

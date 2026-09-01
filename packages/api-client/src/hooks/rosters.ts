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

export function useRoster(
	client: ApiClient,
	editionId: string,
	teamId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.rosters.byEditionTeam(editionId, teamId),
		queryFn: () =>
			unwrap(
				// @ts-expect-error GET /editions/:editionId/teams/:teamId/roster
				client.editions({ editionId }).teams({ teamId }).roster.get(),
			),
		enabled: !!editionId && !!teamId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useAddPlayerToRoster(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ editionId: string; teamId: string; body: Record<string, unknown> }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ editionId, teamId, body }) =>
			unwrap(
				// @ts-expect-error POST /editions/:editionId/teams/:teamId/roster
				client
					.editions({ editionId })
					.teams({ teamId })
					.roster.post(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({
				queryKey: queryKeys.rosters.byEditionTeam(vars.editionId, vars.teamId),
			});
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});
}

export function useUpdateRosterEntry(
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
				// @ts-expect-error PATCH /rosters/:id
				client.rosters({ id }).patch(body as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.rosters.all() });
			options?.onSuccess?.(...args);
		},
	});
}

export function useRemovePlayerFromRoster(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(
				// @ts-expect-error DELETE /rosters/:id
				client.rosters({ id }).delete(undefined as never, undefined as never),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.rosters.all() });
			options?.onSuccess?.(...args);
		},
	});
}

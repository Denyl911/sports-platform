import type {
	AddPlayerToRoster,
	UpdateTournamentRoster,
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

// El POST anidado omite editionId/teamId (van en la ruta):
// POST /editions/:editionId/teams/:teamId/roster
type AddPlayerBody = Omit<AddPlayerToRoster, "editionId" | "teamId">;

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
			unwrap(client.editions({ editionId }).teams({ teamId }).roster.get()),
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
			{ editionId: string; teamId: string; body: AddPlayerBody }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			editionId,
			teamId,
			body,
		}: {
			editionId: string;
			teamId: string;
			body: AddPlayerBody;
		}) =>
			unwrap(
				client.editions({ editionId }).teams({ teamId }).roster.post(body),
			),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.rosters.byEditionTeam(vars.editionId, vars.teamId),
			});
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useUpdateRosterEntry(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ id: string; body: UpdateTournamentRoster }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateTournamentRoster }) =>
			unwrap(client.rosters({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.rosters.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
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
			unwrap(client.rosters({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.rosters.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

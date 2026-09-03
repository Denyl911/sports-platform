import type { UpdateStandingRow } from "@sports/schemas";
import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { type ApiClient, unwrap } from "../client";
import { queryKeys } from "../queryKeys";

export function useStandings(
	client: ApiClient,
	groupId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.standings.byGroup(groupId),
		queryFn: () => unwrap(client.groups({ groupId }).standings.get()),
		enabled: !!groupId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useRecalculateStandings(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (groupId: string) =>
			unwrap(client.groups({ groupId }).standings.recalculate.post()),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, groupId, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.standings.byGroup(groupId),
			});
			options?.onSuccess?.(data, groupId, onMutateResult, context);
		},
	});
}

export function useUpdateStandingRow(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { id: string; body: UpdateStandingRow }>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, body }: { id: string; body: UpdateStandingRow }) =>
			unwrap(client.standings({ id }).patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.standings.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

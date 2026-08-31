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

export function useStandings(
	client: ApiClient,
	groupId: string,
	options?: Omit<UseQueryOptions<unknown, Error, unknown, readonly unknown[]>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: queryKeys.standings.byGroup(groupId),
		queryFn: () =>
			unwrap(
				// @ts-ignore GET /groups/:groupId/standings
				client.groups({ groupId }).standings.get(),
			),
		enabled: !!groupId && options?.enabled !== false,
		...(options as unknown as object ?? {} as object),
	});
}

export function useRecalculateStandings(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, string>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (groupId: string) =>
			unwrap(
				// @ts-ignore POST /groups/:groupId/standings/recalculate
				client.groups({ groupId }).standings.recalculate.post(),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, groupId, ...rest) => {
			qc.invalidateQueries({
				queryKey: queryKeys.standings.byGroup(groupId as string),
			});
			(options?.onSuccess as never)?.(data, groupId, ...rest);
		},
	});;
}

export function useUpdateStandingRow(
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
				// @ts-ignore PATCH /standings/:id
				client.standings({ id }).patch(body as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.standings.all() });
			options?.onSuccess?.(...args);
		},
	});;
}

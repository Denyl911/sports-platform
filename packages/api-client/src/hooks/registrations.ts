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

export function useRegistrationsByStage(
	client: ApiClient,
	stageId: string,
	options?: Omit<UseQueryOptions<unknown, Error, unknown, readonly unknown[]>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: queryKeys.registrations.byStage(stageId),
		queryFn: () =>
			unwrap(
				// @ts-ignore GET /stages/:stageId/registrations
				client.stages({ stageId }).registrations.get(),
			),
		enabled: !!stageId && options?.enabled !== false,
		...(options as unknown as object ?? {} as object),
	});
}

export function useRegistrationsByGroup(
	client: ApiClient,
	groupId: string,
	options?: Omit<UseQueryOptions<unknown, Error, unknown, readonly unknown[]>, "queryKey" | "queryFn">,
) {
	return useQuery({
		queryKey: queryKeys.registrations.byGroup(groupId),
		queryFn: () =>
			unwrap(
				// @ts-ignore GET /registrations/groups/:groupId
				client.registrations.groups({ groupId }).get(),
			),
		enabled: !!groupId && options?.enabled !== false,
		...(options as unknown as object ?? {} as object),
	});
}

export function useRegisterTeam(
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
				// @ts-ignore POST /stages/:stageId/registrations
				client.stages({ stageId }).registrations.post(body as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (data, vars, ...rest) => {
			qc.invalidateQueries({
				queryKey: queryKeys.registrations.byStage(vars.stageId),
			});
			(options?.onSuccess as never)?.(data, vars, ...rest);
		},
	});;
}

export function useUpdateRegistrationGroup(
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
				// @ts-ignore PATCH /registrations/:id/group
				client.registrations({ id }).group.patch(body as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.registrations.all() });
			options?.onSuccess?.(...args);
		},
	});;
}

export function useUnregisterTeam(
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
				// @ts-ignore DELETE /registrations/:id
				client.registrations({ id }).delete(undefined as never, undefined as never),
			),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			qc.invalidateQueries({ queryKey: queryKeys.registrations.all() });
			options?.onSuccess?.(...args);
		},
	});;
}

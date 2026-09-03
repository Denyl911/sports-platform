import type {
	RegisterTeamInStage,
	RegistrationGroupUpdate,
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

// El POST anidado omite el stageId (va en la ruta): POST /stages/:stageId/registrations
type RegisterTeamBody = Omit<RegisterTeamInStage, "stageId">;

export function useRegistrationsByStage(
	client: ApiClient,
	stageId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.registrations.byStage(stageId),
		queryFn: () => unwrap(client.stages({ stageId }).registrations.get()),
		enabled: !!stageId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useRegistrationsByGroup(
	client: ApiClient,
	groupId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, unknown, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.registrations.byGroup(groupId),
		queryFn: () => unwrap(client.registrations.groups({ groupId }).get()),
		enabled: !!groupId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useRegisterTeam(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, { stageId: string; body: RegisterTeamBody }>,
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
			body: RegisterTeamBody;
		}) => unwrap(client.stages({ stageId }).registrations.post(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, vars, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.registrations.byStage(vars.stageId),
			});
			options?.onSuccess?.(data, vars, onMutateResult, context);
		},
	});
}

export function useUpdateRegistrationGroup(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ id: string; body: RegistrationGroupUpdate }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: RegistrationGroupUpdate;
		}) => unwrap(client.registrations({ id }).group.patch(body)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.registrations.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

export function useUnregisterTeam(
	client: ApiClient,
	options?: Omit<UseMutationOptions<unknown, Error, string>, "mutationFn">,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			unwrap(client.registrations({ id }).delete(undefined, undefined)),
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({ queryKey: queryKeys.registrations.all() });
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

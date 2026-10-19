import type {
	AdvanceStageResult,
	GenerateBracketResult,
	StageQualifiers,
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

export function useStageQualifiers(
	client: ApiClient,
	stageId: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, StageQualifiers, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: queryKeys.stages.qualifiers(stageId),
		queryFn: () =>
			unwrap(
				client.stages({ stageId }).qualifiers.get(),
			) as Promise<StageQualifiers>,
		enabled: !!stageId && options?.enabled !== false,
		...((options as unknown as object) ?? ({} as object)),
	});
}

export function useAdvanceStage(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<AdvanceStageResult, Error, string>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (stageId: string) =>
			unwrap(
				client.stages({ stageId }).advance.post(),
			) as Promise<AdvanceStageResult>,
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, stageId, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.registrations.byStage(stageId),
			});
			qc.invalidateQueries({
				queryKey: queryKeys.stages.qualifiers(stageId),
			});
			options?.onSuccess?.(data, stageId, onMutateResult, context);
		},
	});
}

export function useGenerateBracket(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			GenerateBracketResult,
			Error,
			{ stageId: string; force?: boolean }
		>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ stageId, force }: { stageId: string; force?: boolean }) =>
			unwrap(
				client
					.stages({ stageId })
					.bracket.post(
						undefined,
						force ? { query: { force: "true" } } : undefined,
					),
			) as Promise<GenerateBracketResult>,
		...((options as unknown as object) ?? ({} as object)),
		onSuccess: (data, variables, onMutateResult, context) => {
			qc.invalidateQueries({
				queryKey: queryKeys.matches.list({ stageId: variables.stageId }),
			});
			qc.invalidateQueries({
				queryKey: queryKeys.registrations.byStage(variables.stageId),
			});
			options?.onSuccess?.(data, variables, onMutateResult, context);
		},
	});
}

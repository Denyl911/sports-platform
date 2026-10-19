import type {
	CreateInvitation,
	InvitationInfo,
	InvitationResponse,
	RegisterWithInvitation,
} from "@sports/schemas";
import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { type ApiClient, unwrap } from "../client";

export function useInvitationInfo(
	token: string,
	options?: Omit<
		UseQueryOptions<unknown, Error, InvitationInfo, readonly unknown[]>,
		"queryKey" | "queryFn"
	>,
) {
	return useQuery({
		queryKey: ["invitation", token],
		queryFn: async () => {
			const client = await import("../client").then((m) =>
				m.createApiClient({}),
			);
			const res = await client.invitations({ token }).get();
			return res.data as InvitationInfo;
		},
		...(options as unknown as object),
	});
}

export function useRegisterWithInvitation(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<
			unknown,
			Error,
			{ token: string; body: RegisterWithInvitation }
		>,
		"mutationFn"
	>,
) {
	return useMutation({
		mutationFn: ({
			token,
			body,
		}: {
			token: string;
			body: RegisterWithInvitation;
		}) =>
			unwrap(client.invitations({ token }).register.post(body)) as Promise<{
				success: true;
			}>,
		...(options as unknown as object),
	});
}

export function useCreateInvitation(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, CreateInvitation>,
		"mutationFn"
	>,
) {
	return useMutation({
		mutationFn: (body: CreateInvitation) =>
			unwrap(client.invitations.post(body)) as Promise<InvitationResponse>,
		...(options as unknown as object),
	});
}

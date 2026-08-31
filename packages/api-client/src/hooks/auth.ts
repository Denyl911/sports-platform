// @ts-nocheck
import {
	useMutation,
	useQueryClient,
	type UseMutationOptions,
} from "@tanstack/react-query";
import { unwrap, type ApiClient } from "../client";

// ---------------------------------------------------------------------------
// Tipos inferidos del treaty (auth)
// ---------------------------------------------------------------------------

type LoginBody = { email: string; password: string };
type RefreshBody = { refreshToken: string };
type ChangePasswordBody = { currentPassword: string; newPassword: string };

// ---------------------------------------------------------------------------
// Mutations delgadas sobre treaty
// ---------------------------------------------------------------------------

/**
 * POST /auth/login
 * Wrapper delgado: `client.auth.login.post(body)` → `unwrap`
 */
export function useLogin(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, LoginBody>,
		"mutationFn"
	>,
) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: LoginBody) =>
			unwrap(client.auth.login.post(body)),
		...(options as unknown as object ?? {} as object),
		onSuccess: (...args) => {
			// invalida me si existe
			qc.invalidateQueries({ queryKey: ["auth"] });
			options?.onSuccess?.(...args);
		},
	});
}

/**
 * POST /auth/refresh
 */
export function useRefresh(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, RefreshBody>,
		"mutationFn"
	>,
) {
	return useMutation({
		mutationFn: (body: RefreshBody) =>
			unwrap(client.auth.refresh.post(body)),
		...(options as unknown as object ?? {} as object),
	});
}

/**
 * POST /auth/change-password (requiere Authorization)
 */
export function useChangePassword(
	client: ApiClient,
	options?: Omit<
		UseMutationOptions<unknown, Error, ChangePasswordBody>,
		"mutationFn"
	>,
) {
	return useMutation({
		mutationFn: (body: ChangePasswordBody) =>
			// @ts-ignore treaty auth:true ya inyecta header via client
			unwrap((client.auth as unknown as { "change-password": { post: (b: unknown) => Promise<never> } })["change-password"].post(body)),
		...(options as unknown as object ?? {} as object),
	});
}

import * as React from "react";
import {
	api,
	clearTokens,
	getStoredAccessToken,
	getStoredRefreshToken,
	setTokens,
} from "./api";

// Tipos mínimos del usuario público (coincide con userPublicSchema)
export type AuthUser = {
	id: string;
	email: string;
	fullName: string;
	role:
		| "super_admin"
		| "admin"
		| "organizer"
		| "referee"
		| "statistician"
		| "viewer_staff";
	isActive: boolean;
};

type AuthContextValue = {
	user: AuthUser | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<void>;
	register: (data: {
		email: string;
		password: string;
		fullName: string;
		role?: AuthUser["role"];
	}) => Promise<void>;
	logout: () => void;
	refresh: () => Promise<void>;
	hasRole: (...roles: AuthUser["role"][]) => boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
	const ctx = React.useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = React.useState<AuthUser | null>(null);
	const [isLoading, setIsLoading] = React.useState(true);

	const fetchMe = React.useCallback(async () => {
		const token = getStoredAccessToken();
		if (!token) {
			setUser(null);
			setIsLoading(false);
			return;
		}
		try {
			const res = await api.auth.me.get();
			if (res.error || !res.data) throw new Error("no me");
			setUser(res.data as AuthUser);
		} catch {
			// token inválido/expirado -> intenta refresh
			const refreshToken = getStoredRefreshToken();
			if (!refreshToken) {
				clearTokens();
				setUser(null);
				setIsLoading(false);
				return;
			}
			try {
				const r = await api.auth.refresh.post({ refreshToken });
				if (r.error || !r.data) throw new Error("refresh failed");
				setTokens(r.data as { accessToken: string; refreshToken: string });
				const me2 = await api.auth.me.get();
				if (me2.error || !me2.data) throw new Error("no me after refresh");
				setUser(me2.data as AuthUser);
			} catch {
				clearTokens();
				setUser(null);
			}
		} finally {
			setIsLoading(false);
		}
	}, []);

	React.useEffect(() => {
		fetchMe();
	}, [fetchMe]);

	const login = React.useCallback(async (email: string, password: string) => {
		const res = await api.auth.login.post({ email, password });
		if (res.error || !res.data) {
			throw new Error(
				(res.error?.value as { message?: string })?.message ?? "Login failed",
			);
		}
		const data = res.data as {
			accessToken: string;
			refreshToken: string;
			user: AuthUser;
		};
		setTokens({
			accessToken: data.accessToken,
			refreshToken: data.refreshToken,
		});
		setUser(data.user);
	}, []);

	const register = React.useCallback(
		async (data: {
			email: string;
			password: string;
			fullName: string;
			role?: AuthUser["role"];
		}) => {
			const res = await api.auth.register.post(data as never);
			if (res.error || !res.data) {
				throw new Error(
					(res.error?.value as { message?: string })?.message ??
						"Register failed",
				);
			}
			// Auto-login tras registro
			await login(data.email, data.password);
		},
		[login],
	);

	const logout = React.useCallback(() => {
		clearTokens();
		setUser(null);
		if (typeof window !== "undefined") window.location.href = "/auth/login";
	}, []);

	const refresh = React.useCallback(async () => {
		const refreshToken = getStoredRefreshToken();
		if (!refreshToken) throw new Error("No refresh token");
		const res = await api.auth.refresh.post({ refreshToken });
		if (res.error || !res.data) throw new Error("Refresh failed");
		setTokens(res.data as { accessToken: string; refreshToken: string });
		const me = await api.auth.me.get();
		if (me.data) setUser(me.data as AuthUser);
	}, []);

	const hasRole = React.useCallback(
		(...roles: AuthUser["role"][]) => {
			if (!user) return false;
			if (user.role === "super_admin") return true;
			return roles.includes(user.role);
		},
		[user],
	);

	const value = React.useMemo<AuthContextValue>(
		() => ({
			user,
			isAuthenticated: !!user,
			isLoading,
			login,
			register,
			logout,
			refresh,
			hasRole,
		}),
		[user, isLoading, login, register, logout, refresh, hasRole],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

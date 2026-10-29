import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	authService,
	type UserProfile,
} from "@/src/api/services/auth.service";
import {
	clearEmpresaSelecionada,
	getSessionToken,
	setSessionToken,
} from "@/src/api/client";
import { extrairErroApi } from "@/src/api/client";

type AuthState = {
	loading: boolean;
	profile: UserProfile | null;
	signIn: (email: string, password: string) => Promise<void>;
	signOut: () => Promise<void>;
	refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [loading, setLoading] = useState(true);
	const [profile, setProfile] = useState<UserProfile | null>(null);

	const refreshProfile = useCallback(async () => {
		const token = await getSessionToken();
		if (!token) {
			setProfile(null);
			return;
		}
		const p = await authService.getProfile();
		setProfile(p);
	}, []);

	useEffect(() => {
		(async () => {
			try {
				await refreshProfile();
			} catch {
				await setSessionToken(null);
				setProfile(null);
			} finally {
				setLoading(false);
			}
		})();
	}, [refreshProfile]);

	const signIn = useCallback(async (email: string, password: string) => {
		const token = await authService.signIn({ email, password });
		await setSessionToken(token);
		await refreshProfile();
	}, [refreshProfile]);

	const signOut = useCallback(async () => {
		await authService.logout();
		await setSessionToken(null);
		await clearEmpresaSelecionada();
		setProfile(null);
	}, []);

	const value = useMemo(
		() => ({ loading, profile, signIn, signOut, refreshProfile }),
		[loading, profile, signIn, signOut, refreshProfile],
	);

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
}

export function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth fora do AuthProvider");
	return ctx;
}

export function formatAuthError(error: unknown) {
	return extrairErroApi(error);
}

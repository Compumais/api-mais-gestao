import { api } from "@/src/api/client";

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginResponse {
	token?: string;
	session?: { token: string; id: string; expiresAt: string };
	user?: { id: string; email: string; name: string };
}

export interface UserProfile {
	id: string;
	nome: string;
	email: string;
	perfil: string[];
	plano?: string | null;
}

function extrairToken(resposta: LoginResponse): string | null {
	if (resposta.token) return resposta.token;
	if (resposta.session?.token) return resposta.session.token;
	return null;
}

export const authService = {
	async signIn(credentials: LoginCredentials): Promise<string> {
		const { data } = await api.post<LoginResponse>(
			"/api/auth/sign-in/email",
			credentials,
		);
		const token = extrairToken(data);
		if (!token) {
			throw new Error("Login sem token de sessão");
		}
		return token;
	},

	async getProfile(): Promise<UserProfile> {
		const { data } = await api.get<UserProfile>("/api/auth/perfil");
		const perfilRaw = data.perfil;
		const perfil = Array.isArray(perfilRaw)
			? perfilRaw
			: perfilRaw
				? [String(perfilRaw)]
				: [];
		return { ...data, perfil };
	},

	async logout(): Promise<void> {
		try {
			await api.post("/api/auth/logout");
		} catch {
			// ignore
		}
	},
};

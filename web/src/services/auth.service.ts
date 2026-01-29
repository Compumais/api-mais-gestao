import { api } from "@/lib/axios";

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface LoginResponse {
	token?: string;
	session?: {
		token: string;
		id: string;
		expiresAt: string;
	};
	user?: {
		id: string;
		email: string;
		name: string;
	};
}

export interface UserProfile {
	id: string;
	nome: string;
	email: string;
	perfil: string;
}

export const authService = {
	async signIn(credentials: LoginCredentials): Promise<LoginResponse> {
		const { data } = await api.post<LoginResponse>(
			"/api/auth/sign-in/email",
			credentials,
		);
		return data;
	},

	async getProfile(): Promise<UserProfile> {
		const { data } = await api.get<UserProfile>("/auth/perfil");
		return data;
	},

	async logout(): Promise<void> {
		await api.post("/api/auth/logout");
	},
};

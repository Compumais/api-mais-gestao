import { api } from "@/lib/axios";

export interface LoginCredentials {
	email: string;
	password: string;
}

export interface RegisterCredentials {
	email: string;
	password: string;
	name: string;
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

export interface RegisterResponse {
	user: {
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
	async signUp(credentials: RegisterCredentials): Promise<RegisterResponse> {
		const { data } = await api.post<RegisterResponse>(
			"/api/auth/sign-up/email",
			credentials,
		);
		return data;
	},

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

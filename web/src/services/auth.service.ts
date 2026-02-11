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

export interface UpdateProfileData {
	nome: string;
	email: string;
	senhaAtual?: string;
	senha?: string;
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
		const { data } = await api.get("/api/auth/get-session");

		if (!data || !data.user) {
			throw new Error("Não foi possível obter a sessão do usuário");
		}

		return {
			id: data.user.id,
			nome: data.user.name,
			email: data.user.email,
			perfil: data.user.perfil,
		};
	},

	async updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
		const { senha, senhaAtual, ...dadosPerfil } = profileData;
		const erros: string[] = [];

		// Atualizar apenas o nome via Better Auth
		// O Better Auth não permite atualização direta de email por segurança
		// O email deve ser alterado através de um fluxo de verificação separado
		// O Better Auth usa 'name' ao invés de 'nome' na API
		if (dadosPerfil.nome && dadosPerfil.nome.trim() !== "") {
			try {
				await api.post("/api/auth/update-user", {
					name: dadosPerfil.nome,
				});
			} catch (error: unknown) {
				const errorMessage =
					error instanceof Error
						? error.message
						: "Erro desconhecido ao atualizar perfil";
				erros.push(errorMessage);
			}
		}

		// Atualizar senha se fornecida via Better Auth
		// O Better Auth espera 'newPassword' e 'currentPassword' (obrigatório para segurança)
		if (senha && senha.trim() !== "") {
			if (!senhaAtual || senhaAtual.trim() === "") {
				erros.push("Senha atual é obrigatória para alterar a senha");
			} else {
				try {
					await api.post("/api/auth/change-password", {
						currentPassword: senhaAtual,
						newPassword: senha,
					});
				} catch (error: unknown) {
					const errorMessage =
						error instanceof Error ? error.message : "Erro ao atualizar senha";
					erros.push(errorMessage);
				}
			}
		}

		// Se houver erros, lança exceção com todas as mensagens
		if (erros.length > 0) {
			throw new Error(erros.join("; "));
		}

		// Retornar perfil atualizado para garantir que o cache seja atualizado
		return this.getProfile();
	},

	async logout(): Promise<void> {
		await api.post("/api/auth/logout");
	},
};

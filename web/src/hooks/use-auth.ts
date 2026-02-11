"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";

export interface User {
	id: string;
	nome: string;
	email: string;
	perfil: string;
}

const TOKEN_KEY = "token:mais-gestao";

export function useAuth() {
	const router = useRouter();
	const queryClient = useQueryClient();

	// Função para verificar se há token
	const hasToken = (): boolean => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem(TOKEN_KEY) !== null;
	};

	// Usar React Query para buscar o perfil do usuário
	// Isso permite que o cache seja compartilhado com outros componentes
	const {
		data: user,
		isLoading,
		refetch,
	} = useQuery({
		queryKey: ["perfil"],
		queryFn: () => authService.getProfile(),
		enabled: hasToken(),
		retry: false,
		onError: (error: Error) => {
			console.error("Erro ao buscar usuário:", error);
			// Se der erro 401, remove o token
			if (error.message.includes("401")) {
				if (typeof window !== "undefined") {
					localStorage.removeItem(TOKEN_KEY);
				}
			}
		},
	});

	const logout = async () => {
		try {
			await authService.logout();
		} catch (error) {
			console.error("Erro ao fazer logout:", error);
		} finally {
			if (typeof window !== "undefined") {
				localStorage.removeItem(TOKEN_KEY);
			}
			// Limpar o cache do React Query
			queryClient.removeQueries({ queryKey: ["perfil"] });
			router.push("/entrar");
		}
	};

	return {
		isAuthenticated: !!user,
		user: user || null,
		isLoading,
		logout,
		refetchUser: refetch,
	};
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { limparSessaoFrontend, marcarSessaoFrontend } from "@/lib/auth-session-cookie";
import {
	extractSessionTokenFromLoginResponse,
	getSessionToken,
	setSessionToken,
} from "@/lib/auth-token";
import { limparEmpresaSelecionada } from "@/provider/empresa-provider";
import { authService } from "@/services/auth.service";

export interface User {
	id: string;
	nome: string;
	email: string;
	perfil: string[];
	plano?: string | null;
}

export function useAuth() {
	const router = useRouter();
	const queryClient = useQueryClient();

	// Usar React Query para buscar o perfil do usuário via cookie de sessão (Better Auth)
	const {
		data: user,
		isLoading,
		isError,
		refetch,
	} = useQuery({
		queryKey: ["perfil"],
		queryFn: () => authService.getProfile(),
		retry: false,
		refetchOnWindowFocus: false,
		refetchOnMount: true, // Sempre verificar sessão ao montar o componente
		refetchOnReconnect: true, // Verificar sessão ao reconectar
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	useEffect(() => {
		if (user && !isError) {
			marcarSessaoFrontend();
		}
	}, [user, isError]);

	useEffect(() => {
		if (!user || isError || getSessionToken()) return;

		void authClient.getSession().then((sessao) => {
			const token = extractSessionTokenFromLoginResponse(sessao.data ?? {});
			if (token) setSessionToken(token);
		});
	}, [user, isError]);

	const logout = async () => {
		try {
			// authClient.signOut() invalida o cookie de sessão para todos os provedores
			// (email/senha e Google OAuth)
			await authClient.signOut();
		} catch (error) {
			console.error("Erro ao fazer logout:", error);
		} finally {
			setSessionToken(null);
			limparSessaoFrontend();
			limparEmpresaSelecionada();
			queryClient.clear();
			router.push("/entrar");
		}
	};

	return {
		isAuthenticated: !!user,
		user: user || null,
		isLoading,
		isError,
		logout,
		refetchUser: refetch,
	};
}

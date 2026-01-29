"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth.service";

export interface User {
	id: string;
	nome: string;
	email: string;
	perfil: string;
}

const TOKEN_KEY = "token:mais-gestao";

export function useAuth() {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const router = useRouter();

	// Função para verificar se há token
	const hasToken = (): boolean => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem(TOKEN_KEY) !== null;
	};

	const logout = async () => {
		try {
			await authService.logout();
		} catch (error) {
			console.error("Erro ao fazer logout:", error);
		} finally {
			if (typeof window !== "undefined") {
				localStorage.removeItem(TOKEN_KEY);
			}
			setUser(null);
			router.push("/login");
		}
	};

	const fetchUser = async () => {
		if (!hasToken()) {
			setLoading(false);
			return;
		}

		try {
			const userData = await authService.getProfile();
			setUser(userData);
			setLoading(false);
		} catch (error) {
			console.error("Erro ao buscar usuário:", error);
			// Se der erro 401, remove o token
			if (error instanceof Error && error.message.includes("401")) {
				if (typeof window !== "undefined") {
					localStorage.removeItem(TOKEN_KEY);
				}
			}
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUser();
	}, []);

	return {
		isAuthenticated: !!user,
		user,
		isLoading: loading,
		logout,
	};
}

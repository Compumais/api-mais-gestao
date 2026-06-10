"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { empresasService } from "@/services/empresas.service";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated, isLoading, user } = useAuth();
	const { localStorageEmpresa, selecionarEmpresa } = useEmpresa();
	const router = useRouter();
	const pathname = usePathname();
	const [isMounted, setIsMounted] = useState(false);

	// Garantir que só executa no cliente
	useEffect(() => {
		setIsMounted(true);
	}, []);

	// Busca empresas do servidor apenas quando autenticado e sem empresa no localStorage
	// Se já tiver empresa no localStorage, não precisa buscar
	// IMPORTANTE: Usa idproprietario para buscar apenas empresas onde o usuário é proprietário
	const { data: empresasData, isLoading: isLoadingEmpresas } = useQuery({
		queryKey: ["empresas-usuario", user?.id],
		queryFn: () =>
			empresasService.listar({ idproprietario: user?.id, limit: 1 }),
		enabled: !!user?.id && !localStorageEmpresa && isMounted,
		retry: false,
		staleTime: 1000 * 60 * 5, // 5 minutos
	});

	// Seleciona automaticamente a primeira empresa encontrada no servidor
	// IMPORTANTE: Só executa se NÃO tiver empresa no localStorage
	useEffect(() => {
		// Se já tiver empresa no localStorage, não precisa fazer nada
		if (localStorageEmpresa || !isMounted) return;

		// Se ainda está carregando empresas, aguardar
		if (isLoadingEmpresas) return;

		// Se não tem dados ainda, aguardar
		if (!empresasData) return;

		if (empresasData.data.length > 0) {
			// Tem empresa no banco → seleciona automaticamente
			const primeiraEmpresa = empresasData.data[0];
			if (primeiraEmpresa) {
				selecionarEmpresa(primeiraEmpresa);
			}
		} else {
			// Não tem empresa no banco → redireciona para criar
			// Mas só se não estiver já na página de criação ou assinatura
			// E só se realmente não tiver empresa no localStorage (pode ter sido criada mas a query ainda não atualizou)
			if (
				pathname !== "/empresas/nova" &&
				pathname !== "/assinatura" &&
				!localStorageEmpresa
			) {
				router.push("/empresas/nova");
			}
		}
	}, [
		empresasData,
		localStorageEmpresa,
		selecionarEmpresa,
		router,
		pathname,
		isMounted,
		isLoadingEmpresas,
	]);

	useEffect(() => {
		if (!isMounted || isLoading) return;

		if (!isAuthenticated) {
			router.push("/entrar");
			return;
		}

		// IMPORTANTE: Apenas usuários que são proprietários de empresas precisam ter plano
		// Verificar se o usuário é proprietário (tem empresas como proprietário)
		const ehProprietario = empresasData?.data && empresasData.data.length > 0;
		const temEmpresa = localStorageEmpresa || ehProprietario;

		// Se não for proprietário, não precisa verificar plano (pode acessar)
		if (!ehProprietario) {
			return; // Usuário não é proprietário, não precisa de plano
		}

		// Se for proprietário, verificar se tem plano
		if (user && (user.plano === null || user.plano === undefined)) {
			// Só redirecionar para assinatura se já tiver empresa e for proprietário
			if (
				temEmpresa &&
				pathname !== "/assinatura" &&
				pathname !== "/empresas/nova"
			) {
				router.push("/assinatura");
			}
		}
	}, [
		isAuthenticated,
		isLoading,
		user,
		router,
		pathname,
		isMounted,
		localStorageEmpresa,
		empresasData,
	]);

	// Mostra loading enquanto verifica autenticação ou carrega empresas do servidor
	// Também mostra loading durante a montagem inicial para evitar mismatch de hidratação
	// Só mostra loading para empresas se não tiver empresa no localStorage
	const isResolvendo =
		!isMounted ||
		isLoading ||
		(isAuthenticated && !localStorageEmpresa && isLoadingEmpresas);

	if (isResolvendo) {
		return (
			<div className="flex min-h-svh items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-6">
					<div className="relative">
						<div className="text-primary mr-3">
							<CPlusIcon size={64} />
						</div>
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
						</div>
					</div>
					<div className="flex flex-col items-center gap-2">
						<h2 className="text-xl font-semibold">Mais Gestão</h2>
						<p className="text-sm text-muted-foreground">
							Carregando sua área de trabalho
							<span className="loading-dots">
								<span className="dot">.</span>
								<span className="dot">.</span>
								<span className="dot">.</span>
							</span>
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return null;
	}

	// IMPORTANTE: Apenas usuários que são proprietários de empresas precisam ter plano
	// Verificar se o usuário é proprietário (tem empresas como proprietário)
	const ehProprietario = empresasData?.data && empresasData.data.length > 0;
	const temEmpresa = localStorageEmpresa || ehProprietario;

	// Se for proprietário e não tem plano, verificar se está na página de assinatura
	// Se não estiver, não renderizar (aguardando redirecionamento)
	if (
		ehProprietario &&
		user &&
		(user.plano === null || user.plano === undefined) &&
		temEmpresa
	) {
		if (pathname !== "/assinatura" && pathname !== "/empresas/nova") {
			return null; // Aguardando redirecionamento
		}
	}

	return <>{children}</>;
}

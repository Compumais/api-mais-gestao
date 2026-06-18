"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { useEmpresasUsuario } from "@/hooks/use-empresas-usuario";
import {
	EMPRESA_FORCAR_PRIMEIRA_KEY,
	EMPRESA_SELECIONADA_KEY,
} from "@/provider/empresa-provider";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated, isLoading, user } = useAuth();
	const { localStorageEmpresa, selecionarEmpresa } = useEmpresa();
	const router = useRouter();
	const pathname = usePathname();
	const [isMounted, setIsMounted] = useState(false);
	const empresaSelecionadaRef = useRef(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		empresaSelecionadaRef.current = false;
	}, [user?.id]);

	const {
		data: empresas,
		isSuccess: empresasCarregadas,
		isError: empresasErro,
		isFetching: empresasFetching,
	} = useEmpresasUsuario();

	const listaEmpresas = empresas ?? [];

	useEffect(() => {
		if (!isMounted || !user?.id) return;
		if (!empresasCarregadas) return;
		if (empresaSelecionadaRef.current) return;

		if (listaEmpresas.length > 0) {
			const forcarPrimeira =
				typeof window !== "undefined" &&
				sessionStorage.getItem(EMPRESA_FORCAR_PRIMEIRA_KEY) === "1";

			if (forcarPrimeira) {
				sessionStorage.removeItem(EMPRESA_FORCAR_PRIMEIRA_KEY);
				const primeiraEmpresa = listaEmpresas[0];
				if (primeiraEmpresa) {
					empresaSelecionadaRef.current = true;
					selecionarEmpresa(primeiraEmpresa);
				}
				return;
			}

			const empresaAtual = localStorageEmpresa
				? listaEmpresas.find((empresa) => empresa.id === localStorageEmpresa.id)
				: null;

			if (empresaAtual) {
				empresaSelecionadaRef.current = true;
				if (!localStorage.getItem(EMPRESA_SELECIONADA_KEY)) {
					selecionarEmpresa(empresaAtual);
				}
				return;
			}

			const primeiraEmpresa = listaEmpresas[0];
			if (primeiraEmpresa) {
				empresaSelecionadaRef.current = true;
				selecionarEmpresa(primeiraEmpresa);
			}
			return;
		}

		if (
			listaEmpresas.length === 0 &&
			user.perfil?.includes("proprietario") &&
			pathname !== "/empresas/nova"
		) {
			router.push("/empresas/nova");
		}
	}, [
		listaEmpresas,
		empresasCarregadas,
		localStorageEmpresa,
		selecionarEmpresa,
		router,
		pathname,
		isMounted,
		user?.id,
		user?.perfil,
	]);

	useEffect(() => {
		if (!isMounted || isLoading) return;

		if (!user) {
			router.push("/entrar");
		}
	}, [user, isLoading, router, isMounted]);

	const isResolvendo =
		!isMounted ||
		isLoading ||
		(isAuthenticated &&
			!!user?.id &&
			!localStorageEmpresa &&
			(empresasFetching || (!empresasCarregadas && !empresasErro)));

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
							Carregando sua ?rea de trabalho
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

	if (!user) {
		return null;
	}

	return <>{children}</>;
}

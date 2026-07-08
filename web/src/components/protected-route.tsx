"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CPlusIcon } from "@/components/icons/c-plus";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { useEmpresasUsuario } from "@/hooks/use-empresas-usuario";
import { AUTH_SESSION_COOKIE } from "@/lib/auth-session-cookie";
import { getSessionToken } from "@/lib/auth-token";
import {
	getDefaultRouteForUser,
	isGarcom,
	isRouteAllowedForGarcom,
	isSuper,
} from "@/lib/perfis";
import {
	EMPRESA_FORCAR_PRIMEIRA_KEY,
	EMPRESA_SELECIONADA_KEY,
} from "@/provider/empresa-provider";

function temIndicadorSessao(): boolean {
	if (typeof window === "undefined") return false;

	const temCookie = document.cookie
		.split(";")
		.some((parte) => parte.trim().startsWith(`${AUTH_SESSION_COOKIE}=`));

	return temCookie || !!getSessionToken();
}

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const { isAuthenticated, isLoading, user, isError, refetchUser } = useAuth();
	const { localStorageEmpresa, selecionarEmpresa } = useEmpresa();
	const router = useRouter();
	const pathname = usePathname();
	const [isMounted, setIsMounted] = useState(false);
	const [sessionHint, setSessionHint] = useState(false);
	const empresaSelecionadaRef = useRef(false);
	const refetchSessaoTentadoRef = useRef(false);

	useEffect(() => {
		setIsMounted(true);
		setSessionHint(temIndicadorSessao());
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: user?.id é uma dependência necessária para o useEffect
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
		if (!isMounted || isLoading || !user) return;

		if (isSuper(user) && pathname.startsWith("/super") === false) {
			router.push(getDefaultRouteForUser(user));
			return;
		}

		if (isGarcom(user) && !isRouteAllowedForGarcom(pathname)) {
			router.push(getDefaultRouteForUser(user));
		}
	}, [isMounted, isLoading, user, pathname, router]);

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
		if (!isMounted || isLoading || user) return;
		if (!sessionHint || isError || refetchSessaoTentadoRef.current) return;

		refetchSessaoTentadoRef.current = true;
		void refetchUser();
	}, [isMounted, isLoading, user, sessionHint, isError, refetchUser]);

	useEffect(() => {
		if (!isMounted || isLoading) return;

		if (!user && (!sessionHint || isError)) {
			router.push("/entrar");
		}
	}, [user, isLoading, router, isMounted, sessionHint, isError]);

	const isResolvendo =
		!isMounted ||
		isLoading ||
		(!user && sessionHint && !isError) ||
		(isAuthenticated &&
			!!user?.id &&
			!localStorageEmpresa &&
			(empresasFetching || (!empresasCarregadas && !empresasErro)));

	const loadingScreen = (
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

	if (isResolvendo || !user) {
		return loadingScreen;
	}

	if (isGarcom(user) && !isRouteAllowedForGarcom(pathname)) {
		return loadingScreen;
	}

	return <>{children}</>;
}
